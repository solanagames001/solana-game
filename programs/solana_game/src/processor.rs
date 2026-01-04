#![allow(clippy::too_many_arguments)]

// ============================
// MAINNET FINAL — v3.12
// Program version: 3.12
// Model: X3 GLOBAL QUEUE (PRODUCTION)
// 
// Security features:
// - Overflow protection (checked_add, saturating_*)
// - System wallet validation for all transfers
// - PDA verification for all accounts
// - Anti-gaming: self-owner 100% to treasury
// - X3 threshold minimum 3 slots enforced
// ============================

use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_lang::{
    solana_program::{program::invoke_signed, system_instruction},
    AccountDeserialize, AccountSerialize,
};
use std::io::Cursor;

// =============================================================
// 1) ERRORS
// =============================================================

#[error_code]
pub enum CustomError {
    #[msg("Invalid distribution sum (must be 100)")]
    InvalidDistribution,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid level")]
    InvalidLevel,
    #[msg("Invalid price")]
    InvalidPrice,
    #[msg("Level already activated")]
    AlreadyActivated,
    #[msg("Slots are already full")]
    SlotsAlreadyFull,
    #[msg("Not enough slots filled to recycle")]
    SlotsNotEnoughToRecycle,
    #[msg("Queue is empty")]
    QueueIsEmpty,
    #[msg("Level not activated")]
    LevelNotActivated,
    #[msg("Overflow")]
    Overflow,
    #[msg("QueuePage key mismatch")]
    QueuePageKeyMismatch,
    #[msg("Account cast failed")]
    AccountCastError,
    #[msg("Queue page is full")]
    QueuePageFull,
    #[msg("Player already in queue")]
    AlreadyInQueue,
    #[msg("Next queue page already exists (rollover conflict)")]
    QueueNextPageAlreadyExists,
    #[msg("Minimum entry delay not satisfied")]
    MinEntryDelay,
    #[msg("Recipient must be a system wallet (no data)")]
    RecipientMustBeSystemWallet,
    #[msg("Rollover requires more than one new page (not supported in one tx)")]
    RolloverNeedsSecondNewPage,
}

// =============================================================
// 2) EVENTS
// =============================================================

#[event]
pub struct ConfigInitialized {
    pub admin: Pubkey,
    pub treasury: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct PlayerCreated {
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct LevelActivated {
    pub owner: Pubkey,
    pub level: u8,
    pub lamports: u64,
    pub timestamp: i64,
}

#[event]
pub struct LevelRecycled {
    pub owner: Pubkey,
    pub level: u8,
    pub cycles: u64,
    pub lamports: u64,
    pub timestamp: i64,
}

#[event]
pub struct SlotsFilledN {
    pub owner: Pubkey,
    pub level: u8,
    pub cycles: u64,
    pub filled: u8,
}

#[event]
pub struct DequeuedOwner {
    pub owner_player: Pubkey,
    pub level: u8,
    pub page_index: u32,
}

#[event]
pub struct Enqueued {
    pub player: Pubkey,
    pub level: u8,
    pub page_index: u32,
    pub position_in_page: u32,
}

#[event]
pub struct QueuePageCreated {
    pub level: u8,
    pub pool: Pubkey,
    pub page_index: u32,
    pub page: Pubkey,
}

// =============================================================
// 3) STATE (ACCOUNTS)
// =============================================================

#[account]
pub struct ConfigV3 {
    pub admin: Pubkey,
    pub treasury: Pubkey,
    pub perc_admin: u8,
    pub perc_ref1: u8,
    pub perc_ref2: u8,
    pub perc_ref3: u8,
    pub perc_treasury: u8,
    pub base_price_lamports: u64,
    pub price_ratio: u8,
    pub min_entry_delay: u32,
    pub auto_recycle: bool,
    pub slots_to_recycle: u8,
    pub max_levels: u8,
    pub bump: u8,
    pub version: u8,
    pub version_minor: u8,
}

impl ConfigV3 {
    pub const SIZE: usize = 32 + 32 + 5 + 8 + 1 + 4 + 1 + 1 + 1 + 1 + 1 + 1 + 1;
}

#[account]
pub struct Player {
    pub authority: Pubkey,
    pub bump: u8,
    pub created_at: i64,
    pub games_played: u64,
    pub upline1: Pubkey,
    pub upline2: Pubkey,
    pub upline3: Pubkey,
}

impl Player {
    pub const SIZE: usize = 32 + 1 + 8 + 8 + (32 * 3);
}

#[account]
pub struct LevelState {
    pub player: Pubkey,
    pub authority: Pubkey,
    pub level: u8,
    pub bump: u8,
    pub activated_at: i64,
    pub cycles: u64,
    pub slots_filled: u64,
    pub head_page: Option<Pubkey>,
    pub tail_page: Option<Pubkey>,
}

impl LevelState {
    pub const SIZE: usize = 32 + 32 + 1 + 1 + 8 + 8 + 8 + (1 + 32) + (1 + 32);
}

#[account]
pub struct TxGuard {
    pub nonce: u64,
    pub executed_at: i64,
    pub bump: u8,
}

impl TxGuard {
    pub const SIZE: usize = 8 + 8 + 1;
}

#[account]
pub struct GlobalStats {
    pub total_players: u64,
    pub last_player: Pubkey,
    pub bump: u8,
}

impl GlobalStats {
    pub const SIZE: usize = 8 + 32 + 1;
}

#[account]
pub struct LevelPool {
    pub config: Pubkey,
    pub level: u8,
    pub bump: u8,
    pub head_page: Option<Pubkey>,
    pub tail_page: Option<Pubkey>,
    pub total_enqueued: u64,
    pub total_dequeued: u64,
}

impl LevelPool {
    pub const SIZE: usize = 32 + 1 + 1 + 33 + 33 + 8 + 8;
}

// =============================================================
// 4) QUEUE PAGE (GLOBAL)
// =============================================================

#[account]
pub struct QueuePage {
    pub bump: u8,
    pub level_pool: Pubkey,
    pub page_index: u32,
    pub next_page: Option<Pubkey>,
    pub players: Vec<Pubkey>, // Player PDA
}

impl QueuePage {
    pub fn space_with(capacity: usize) -> usize {
        8 + 1 + 32 + 4 + (1 + 32) + 4 + 32 * capacity
    }
    pub fn space_default() -> usize {
        Self::space_with(QUEUE_PAGE_CAPACITY_DEFAULT)
    }
    pub fn seeds(level_pool: &Pubkey, page_index: u32) -> [Vec<u8>; 3] {
        [
            b"queue_page_v1".to_vec(),
            level_pool.to_bytes().to_vec(),
            page_index.to_le_bytes().to_vec(),
        ]
    }
}

// =============================================================
// 5) CONSTANTS + HELPERS
// =============================================================

pub const MAX_LEVEL: u8 = 16;
pub const QUEUE_PAGE_CAPACITY_DEFAULT: usize = 64;

pub const LEVEL_PRICES_LAMPORTS: [u64; 16] = [
    50_000_000,
    180_000_000,
    360_000_000,
    680_000_000,
    1_100_000_000,
    1_550_000_000,
    2_100_000_000,
    2_650_000_000,
    3_250_000_000,
    3_900_000_000,
    4_650_000_000,
    5_450_000_000,
    6_400_000_000,
    7_350_000_000,
    8_000_000_000,
    8_700_000_000,
];

pub const PERC_OWNER: u64 = 60;
pub const PERC_REF1: u64 = 13;
pub const PERC_REF2: u64 = 8;
pub const PERC_REF3: u64 = 5;
pub const PERC_TREASURY_BASE: u64 = 14;
pub const PERC_TOTAL: u64 = 100;

pub fn expected_price_from_cfg(level: u8, _cfg: &ConfigV3) -> u64 {
    if level == 0 || level > MAX_LEVEL {
        return 0;
    }
    LEVEL_PRICES_LAMPORTS[(level - 1) as usize]
}

#[inline(always)]
fn calc_share(price: u64, perc: u64) -> u64 {
    price.saturating_mul(perc) / 100
}

// MAINNET SAFE: recipient must be a wallet (SystemProgram owner + no data)
fn require_system_wallet(ai: &AccountInfo) -> Result<()> {
    require!(
        ai.owner == &system_program::ID && ai.data_is_empty(),
        CustomError::RecipientMustBeSystemWallet
    );
    Ok(())
}

// SAFE: transfer only from authority (Signer wallet)
pub fn safe_transfer<'info>(
    from: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    sys: &AccountInfo<'info>,
    lamports: u64,
) -> Result<()> {
    if lamports == 0 {
        return Ok(());
    }
    let cpi = system_program::Transfer {
        from: from.clone(),
        to: to.clone(),
    };
    system_program::transfer(CpiContext::new(sys.clone(), cpi), lamports)
}

pub fn read_queue_page(ai: &AccountInfo) -> Result<QueuePage> {
    let data = ai.try_borrow_data()?;
    let mut slice: &[u8] = &data;
    Ok(QueuePage::try_deserialize(&mut slice)?)
}

pub fn write_queue_page(ai: &AccountInfo, page: &mut QueuePage) -> Result<()> {
    let mut data = ai.try_borrow_mut_data()?;
    let mut cur = Cursor::new(data.as_mut());
    page.try_serialize(&mut cur)?;
    Ok(())
}

fn derive_level_state_pda(player_pda: &Pubkey, level: u8) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"lvl", player_pda.as_ref(), &[level]], &crate::ID)
}

fn read_player(ai: &AccountInfo) -> Result<Player> {
    let data = ai.try_borrow_data()?;
    let mut slice: &[u8] = &data;
    let player = Player::try_deserialize(&mut slice)
        .map_err(|_| error!(CustomError::AccountCastError))?;
    Ok(player)
}

fn is_level_open_for<'info>(
    upline_wallet: &Pubkey,
    level: u8,
    level_state_ai: &AccountInfo<'info>,
) -> Result<bool> {
    let (player_pda, _) =
        Pubkey::find_program_address(&[b"player", upline_wallet.as_ref()], &crate::ID);
    let (expected_pda, _) = derive_level_state_pda(&player_pda, level);

    if level_state_ai.key != &expected_pda {
        return Ok(false);
    }
    if level_state_ai.owner != &crate::ID {
        return Ok(false);
    }
    if level_state_ai.data_is_empty() {
        return Ok(false);
    }

    let data = level_state_ai.try_borrow_data()?;
    let mut slice: &[u8] = &data;
    let ls = LevelState::try_deserialize(&mut slice)
        .map_err(|_| error!(CustomError::AccountCastError))?;

    Ok(ls.level == level && ls.activated_at > 0 && ls.player == player_pda)
}

fn resolve_ref_with_level_or_admin<'info>(
    upline_key: &Pubkey,
    level: u8,
    level_state_ai_opt: Option<&AccountInfo<'info>>,
    cfg_admin: &Pubkey,
) -> Pubkey {
    if let Some(ai) = level_state_ai_opt {
        if let Ok(true) = is_level_open_for(upline_key, level, ai) {
            return *upline_key;
        }
    }
    *cfg_admin
}

// =============================================================
// 5.1) UNIVERSAL LEVELSTATE MIGRATION
// =============================================================

#[inline(never)]
fn load_or_migrate_level_state(ai: &AccountInfo) -> Result<LevelState> {
    {
        let data = ai.try_borrow_data()?;
        let mut slice: &[u8] = &data;
        if let Ok(ls) = LevelState::try_deserialize(&mut slice) {
            return Ok(ls);
        }
    }
    migrate_legacy_level_state(ai)
}

#[inline(never)]
fn migrate_legacy_level_state(ai: &AccountInfo) -> Result<LevelState> {
    let mut data = ai.try_borrow_mut_data()?;
    let len = data.len();
    if len < 8 {
        return err!(CustomError::AccountCastError);
    }
    let mut idx: usize = 8;

    fn read_u8_safe(data: &[u8], idx: &mut usize, len: usize) -> u8 {
        if *idx + 1 <= len {
            let v = data[*idx];
            *idx += 1;
            v
        } else {
            0
        }
    }
    fn read_i64_safe(data: &[u8], idx: &mut usize, len: usize) -> i64 {
        if *idx + 8 <= len {
            let mut buf = [0u8; 8];
            buf.copy_from_slice(&data[*idx..*idx + 8]);
            *idx += 8;
            i64::from_le_bytes(buf)
        } else {
            0
        }
    }
    fn read_u64_safe(data: &[u8], idx: &mut usize, len: usize) -> u64 {
        if *idx + 8 <= len {
            let mut buf = [0u8; 8];
            buf.copy_from_slice(&data[*idx..*idx + 8]);
            *idx += 8;
            u64::from_le_bytes(buf)
        } else {
            0
        }
    }
    fn read_pubkey_safe(data: &[u8], idx: &mut usize, len: usize) -> Pubkey {
        if *idx + 32 <= len {
            let mut buf = [0u8; 32];
            buf.copy_from_slice(&data[*idx..*idx + 32]);
            *idx += 32;
            Pubkey::new_from_array(buf)
        } else {
            Pubkey::default()
        }
    }
    fn read_option_pubkey_safe(data: &[u8], idx: &mut usize, len: usize) -> Option<Pubkey> {
        if *idx >= len {
            return None;
        }
        let tag = data[*idx];
        *idx += 1;
        if tag == 0 {
            return None;
        }
        if *idx + 32 <= len {
            let mut buf = [0u8; 32];
            buf.copy_from_slice(&data[*idx..*idx + 32]);
            *idx += 32;
            Some(Pubkey::new_from_array(buf))
        } else {
            None
        }
    }

    let player = read_pubkey_safe(&data, &mut idx, len);
    let authority = read_pubkey_safe(&data, &mut idx, len);
    let level = read_u8_safe(&data, &mut idx, len);
    let bump = read_u8_safe(&data, &mut idx, len);
    let activated_at = read_i64_safe(&data, &mut idx, len);
    let cycles = read_u64_safe(&data, &mut idx, len);
    let slots_filled = read_u64_safe(&data, &mut idx, len);

    let head_page = if idx < len {
        read_option_pubkey_safe(&data, &mut idx, len)
    } else {
        None
    };
    let tail_page = if idx < len {
        read_option_pubkey_safe(&data, &mut idx, len)
    } else {
        None
    };

    let owner_ls = LevelState {
        player,
        authority,
        level,
        bump,
        activated_at,
        cycles,
        slots_filled,
        head_page,
        tail_page,
    };

    {
        let mut cursor = Cursor::new(&mut data[..]);
        owner_ls
            .try_serialize(&mut cursor)
            .map_err(|_| error!(CustomError::AccountCastError))?;
    }
    drop(data);

    let data2 = ai.try_borrow_data()?;
    let mut slice2: &[u8] = &data2;
    let ls2 = LevelState::try_deserialize(&mut slice2)
        .map_err(|_| error!(CustomError::AccountCastError))?;
    Ok(ls2)
}

// =============================================================
// 6) INTERNAL HELPERS FOR ACTIVATE_LEVEL_V3 (QUEUE)
// =============================================================

fn create_queue_page<'info>(
    payer: &Signer<'info>,
    system_program_acc: &Program<'info, System>,
    level_pool_key: &Pubkey,
    page_index: u32,
    new_page_ai: &AccountInfo<'info>,
) -> Result<(Pubkey, u8)> {
    let seeds_vec = QueuePage::seeds(level_pool_key, page_index);
    let (page_pda, bump_page) = Pubkey::find_program_address(
        &[&seeds_vec[0], &seeds_vec[1], &seeds_vec[2]],
        &crate::ID,
    );

    require_keys_eq!(page_pda, *new_page_ai.key, CustomError::QueuePageKeyMismatch);

    let space = QueuePage::space_default();
    let lamports_rent = Rent::get()?.minimum_balance(space);
    let ix = system_instruction::create_account(
        &payer.key(),
        &page_pda,
        lamports_rent,
        space as u64,
        &crate::ID,
    );

    invoke_signed(
        &ix,
        &[
            payer.to_account_info(),
            new_page_ai.clone(),
            system_program_acc.to_account_info(),
        ],
        &[&[
            b"queue_page_v1",
            level_pool_key.as_ref(),
            &page_index.to_le_bytes(),
            &[bump_page],
        ]],
    )?;

    Ok((page_pda, bump_page))
}

fn enqueue_into_tail<'info>(
    level: u8,
    pool: &mut Account<'info, LevelPool>,
    payer: &Signer<'info>,
    system_program_acc: &Program<'info, System>,
    // provided accounts:
    tail_page_ai: &AccountInfo<'info>,
    new_page_ai: &AccountInfo<'info>,
    player_pda: Pubkey,
    used_new_page: &mut bool,
) -> Result<()> {
    let pool_key = pool.key();
    let tail_key = pool.tail_page.ok_or(CustomError::QueueIsEmpty)?;

    require_keys_eq!(tail_key, *tail_page_ai.key, CustomError::QueuePageKeyMismatch);

    let mut tail_page = read_queue_page(tail_page_ai)?;

    // Skip if player already in this page (prevents duplicates)
    if tail_page.players.contains(&player_pda) {
        return Ok(());
    }

    if tail_page.players.len() >= QUEUE_PAGE_CAPACITY_DEFAULT {
        require!(!*used_new_page, CustomError::RolloverNeedsSecondNewPage);
        *used_new_page = true;

        require!(tail_page.next_page.is_none(), CustomError::QueueNextPageAlreadyExists);

        // Safe increment with overflow check
        let new_index = tail_page.page_index.checked_add(1).ok_or(CustomError::Overflow)?;
        let (new_pda, bump_page) = create_queue_page(
            payer,
            system_program_acc,
            &pool_key,
            new_index,
            new_page_ai,
        )?;

        let mut new_page = QueuePage {
            bump: bump_page,
            level_pool: pool_key,
            page_index: new_index,
            next_page: None,
            players: vec![player_pda],
        };
        write_queue_page(new_page_ai, &mut new_page)?;

        tail_page.next_page = Some(new_pda);
        write_queue_page(tail_page_ai, &mut tail_page)?;

        pool.tail_page = Some(new_pda);
        pool.total_enqueued = pool.total_enqueued.saturating_add(1);

        emit!(QueuePageCreated {
            level,
            pool: pool_key,
            page_index: new_index,
            page: new_pda,
        });
        emit!(Enqueued {
            player: player_pda,
            level,
            page_index: new_index,
            position_in_page: 0,
        });

        return Ok(());
    }

    tail_page.players.push(player_pda);
    let pos = (tail_page.players.len() - 1) as u32;
    write_queue_page(tail_page_ai, &mut tail_page)?;

    pool.total_enqueued = pool.total_enqueued.saturating_add(1);
    emit!(Enqueued {
        player: player_pda,
        level,
        page_index: tail_page.page_index,
        position_in_page: pos,
    });

    Ok(())
}

// =============================================================
// 6.1) FIRST ACTIVATION
// =============================================================

#[inline(never)]
fn process_first_activation<'info>(
    accounts: &mut ActivateLevelV3<'info>,
    level: u8,
    price: u64,
) -> Result<()> {
    let payer = &accounts.authority;
    let system_program_acc = &accounts.system_program;
    let cfg = &accounts.config_v3;
    let sys = system_program_acc.to_account_info();

    require_keys_eq!(accounts.treasury_account.key(), cfg.treasury);
    require_system_wallet(&accounts.treasury_account.to_account_info())?;

    let page_index: u32 = 0;
    let (page_pda, bump_page) = create_queue_page(
        payer,
        system_program_acc,
        &accounts.level_pool.key(),
        page_index,
        &accounts.new_page,
    )?;

    let mut first_page = QueuePage {
        bump: bump_page,
        level_pool: accounts.level_pool.key(),
        page_index,
        next_page: None,
        players: vec![accounts.player.key()],
    };
    write_queue_page(&accounts.new_page, &mut first_page)?;

    accounts.level_pool.head_page = Some(page_pda);
    accounts.level_pool.tail_page = Some(page_pda);
    accounts.level_pool.total_enqueued = accounts.level_pool.total_enqueued.saturating_add(1);

    emit!(QueuePageCreated {
        level,
        pool: accounts.level_pool.key(),
        page_index,
        page: page_pda,
    });
    emit!(Enqueued {
        player: accounts.player.key(),
        level,
        page_index,
        position_in_page: 0,
    });

    safe_transfer(
        &payer.to_account_info(),
        &accounts.treasury_account.to_account_info(),
        &sys,
        price,
    )?;

    Ok(())
}

// =============================================================
// 6.2) EXISTING QUEUE ACTIVATION (MAINNET SAFE - X3 FIXED)
// =============================================================

#[inline(never)]
fn process_existing_activation<'info>(
    accounts: &mut ActivateLevelV3<'info>,
    level: u8,
    price: u64,
    now: i64,
) -> Result<()> {
    let cfg = &accounts.config_v3;
    let payer = &accounts.authority;
    let system_program_acc = &accounts.system_program;
    let sys = system_program_acc.to_account_info();
    let payer_ai = payer.to_account_info();

    require_keys_eq!(accounts.admin_account.key(), cfg.admin);
    require_keys_eq!(accounts.treasury_account.key(), cfg.treasury);
    require_system_wallet(&accounts.admin_account.to_account_info())?;
    require_system_wallet(&accounts.treasury_account.to_account_info())?;

    let head_key = accounts.level_pool.head_page.ok_or(CustomError::QueueIsEmpty)?;
    require_keys_eq!(head_key, accounts.head_page.key(), CustomError::QueuePageKeyMismatch);

    let head_ai = accounts.head_page.to_account_info();
    let mut head_page = read_queue_page(&head_ai)?;
    require!(!head_page.players.is_empty(), CustomError::QueueIsEmpty);

    let owner_player_pda = head_page.players[0];
    emit!(DequeuedOwner {
        owner_player: owner_player_pda,
        level,
        page_index: head_page.page_index,
    });

    require_keys_eq!(accounts.owner_player.key(), owner_player_pda);

    let is_self_owner = owner_player_pda == accounts.player.key();

    let (owner_ls_pda, owner_ls_bump) = derive_level_state_pda(&owner_player_pda, level);
    require_keys_eq!(accounts.owner_level_state.key(), owner_ls_pda);

    let owner_ls_ai = accounts.owner_level_state.to_account_info();
    if owner_ls_ai.data_is_empty() {
        let space: usize = 8 + LevelState::SIZE;
        let rent = Rent::get()?;
        let lamports = rent.minimum_balance(space);

        let ix = system_instruction::create_account(
            &payer.key(),
            &owner_ls_pda,
            lamports,
            space as u64,
            &crate::ID,
        );
        invoke_signed(
            &ix,
            &[
                payer.to_account_info(),
                owner_ls_ai.clone(),
                system_program_acc.to_account_info(),
            ],
            &[&[
                b"lvl",
                owner_player_pda.as_ref(),
                &[level],
                &[owner_ls_bump],
            ]],
        )?;
    }

    let mut owner_ls = load_or_migrate_level_state(&owner_ls_ai)?;

    let owner_player_opt: Option<Player> = if accounts.owner_player.data_is_empty() {
        None
    } else {
        Some(read_player(&accounts.owner_player)?)
    };

    if owner_ls.authority == Pubkey::default() {
        owner_ls.player = owner_player_pda;
        owner_ls.authority = owner_player_opt
            .as_ref()
            .map(|p| p.authority)
            .unwrap_or(accounts.owner_wallet.key());
        owner_ls.level = level;
        owner_ls.activated_at = now;
        owner_ls.cycles = 0;
        owner_ls.slots_filled = 0;
        owner_ls.bump = owner_ls_bump;
        owner_ls.head_page = None;
        owner_ls.tail_page = None;
    }

    require_keys_eq!(accounts.owner_wallet.key(), owner_ls.authority);
    require_system_wallet(&accounts.owner_wallet.to_account_info())?;

    // ============================================================
    // SELF-OWNER BRANCH:
    // When activator == current queue owner:
    // - 100% payment goes to treasury (prevents self-dealing)
    // - Owner is moved to back of queue (fair rotation)
    // - No slots are counted (owner can't pay themselves)
    // This is INTENTIONAL anti-gaming protection.
    // ============================================================
    if is_self_owner {
        safe_transfer(
            &payer_ai,
            &accounts.treasury_account.to_account_info(),
            &sys,
            price,
        )?;

        head_page.players.remove(0);
        if head_page.players.is_empty() {
            if let Some(next) = head_page.next_page {
                accounts.level_pool.head_page = Some(next);
            } else {
                accounts.level_pool.head_page = Some(head_key);
                accounts.level_pool.tail_page = Some(head_key);
            }
        }
        write_queue_page(&accounts.head_page, &mut head_page)?;
        accounts.level_pool.total_dequeued = accounts.level_pool.total_dequeued.saturating_add(1);

        let mut used_new_page = false;
        enqueue_into_tail(
            level,
            &mut accounts.level_pool,
            payer,
            system_program_acc,
            &accounts.tail_page,
            &accounts.new_page,
            owner_player_pda,
            &mut used_new_page,
        )?;

        {
            let mut writable = accounts.owner_level_state.try_borrow_mut_data()?;
            let mut cursor = Cursor::new(&mut writable[..]);
            owner_ls.try_serialize(&mut cursor)?;
        }

        return Ok(());
    }

    // ============================================================
    // NORMAL ACTIVATION (activator != owner)
    // X3 Logic: Owner stays at head until 3 slots are filled
    // ============================================================

    require!(owner_ls.activated_at > 0, CustomError::LevelNotActivated);

    // X3 matrix requires minimum 3 slots. Runtime protection against future config changes.
    let threshold = cfg.slots_to_recycle.max(3) as u64;
    require!(owner_ls.slots_filled < threshold, CustomError::SlotsAlreadyFull);

    // Increment slots for owner
    owner_ls.slots_filled = owner_ls
        .slots_filled
        .checked_add(1)
        .ok_or(CustomError::Overflow)?;

    emit!(SlotsFilledN {
        owner: owner_ls.authority,
        level: owner_ls.level,
        cycles: owner_ls.cycles,
        filled: owner_ls.slots_filled as u8,
    });

    // Resolve referrers
    let (u1, u2, u3) = owner_player_opt
        .as_ref()
        .map(|op| (op.upline1, op.upline2, op.upline3))
        .unwrap_or((cfg.admin, cfg.admin, cfg.admin));

    let ref1 = resolve_ref_with_level_or_admin(
        &u1,
        level,
        accounts.ref1_level_state.as_ref().map(|a| a),
        &cfg.admin,
    );
    let ref2 = resolve_ref_with_level_or_admin(
        &u2,
        level,
        accounts.ref2_level_state.as_ref().map(|a| a),
        &cfg.admin,
    );
    let ref3 = resolve_ref_with_level_or_admin(
        &u3,
        level,
        accounts.ref3_level_state.as_ref().map(|a| a),
        &cfg.admin,
    );

    // Calculate payouts
    let amt_owner = calc_share(price, PERC_OWNER);
    let amt_ref1_raw = calc_share(price, PERC_REF1);
    let amt_ref2_raw = calc_share(price, PERC_REF2);
    let amt_ref3_raw = calc_share(price, PERC_REF3);

    let sum_non_treas = amt_owner
        .saturating_add(amt_ref1_raw)
        .saturating_add(amt_ref2_raw)
        .saturating_add(amt_ref3_raw);
    let mut amt_treas = price.saturating_sub(sum_non_treas);

    require_keys_eq!(accounts.ref1_account.key(), ref1);
    require_keys_eq!(accounts.ref2_account.key(), ref2);
    require_keys_eq!(accounts.ref3_account.key(), ref3);

    require_system_wallet(&accounts.ref1_account.to_account_info())?;
    require_system_wallet(&accounts.ref2_account.to_account_info())?;
    require_system_wallet(&accounts.ref3_account.to_account_info())?;

    let mut amt_ref1 = amt_ref1_raw;
    let mut amt_ref2 = amt_ref2_raw;
    let mut amt_ref3 = amt_ref3_raw;

    // If referrer is admin/treasury, redirect to treasury
    if ref1 == cfg.treasury || ref1 == cfg.admin {
        amt_treas = amt_treas.saturating_add(amt_ref1);
        amt_ref1 = 0;
    }
    if ref2 == cfg.treasury || ref2 == cfg.admin {
        amt_treas = amt_treas.saturating_add(amt_ref2);
        amt_ref2 = 0;
    }
    if ref3 == cfg.treasury || ref3 == cfg.admin {
        amt_treas = amt_treas.saturating_add(amt_ref3);
        amt_ref3 = 0;
    }

    // Execute transfers
    safe_transfer(&payer_ai, &accounts.owner_wallet.to_account_info(), &sys, amt_owner)?;

    if amt_ref1 > 0 {
        safe_transfer(&payer_ai, &accounts.ref1_account.to_account_info(), &sys, amt_ref1)?;
    }
    if amt_ref2 > 0 {
        safe_transfer(&payer_ai, &accounts.ref2_account.to_account_info(), &sys, amt_ref2)?;
    }
    if amt_ref3 > 0 {
        safe_transfer(&payer_ai, &accounts.ref3_account.to_account_info(), &sys, amt_ref3)?;
    }
    safe_transfer(&payer_ai, &accounts.treasury_account.to_account_info(), &sys, amt_treas)?;

    // ============================================================
    // X3 RECYCLE LOGIC:
    // Owner moves to back of queue ONLY after 3 slots (threshold)
    // This is the core X3 matrix behavior
    // ============================================================
    let should_recycle = owner_ls.slots_filled == threshold;

    if should_recycle {
        owner_ls.cycles = owner_ls.cycles.saturating_add(1);
        owner_ls.slots_filled = 0;
        emit!(LevelRecycled {
            owner: owner_ls.authority,
            level: owner_ls.level,
            cycles: owner_ls.cycles,
            lamports: price,
            timestamp: now,
        });
    }

    // Save owner's LevelState
    {
        let mut writable = accounts.owner_level_state.try_borrow_mut_data()?;
        let mut cursor = Cursor::new(&mut writable[..]);
        owner_ls.try_serialize(&mut cursor)?;
    }

    let mut used_new_page = false;

    // ============================================================
    // QUEUE MANIPULATION:
    // Owner leaves queue ONLY when should_recycle == true
    // This ensures true X3 behavior (owner receives 3 slots first)
    // ============================================================
    if should_recycle {
        head_page.players.remove(0);
        if head_page.players.is_empty() {
            if let Some(next) = head_page.next_page {
                accounts.level_pool.head_page = Some(next);
            } else {
                accounts.level_pool.head_page = Some(head_key);
                accounts.level_pool.tail_page = Some(head_key);
            }
        }
        write_queue_page(&accounts.head_page, &mut head_page)?;
        accounts.level_pool.total_dequeued = accounts.level_pool.total_dequeued.saturating_add(1);

        // Owner returns to end of queue after completing cycle
        enqueue_into_tail(
            level,
            &mut accounts.level_pool,
            payer,
            system_program_acc,
            &accounts.tail_page,
            &accounts.new_page,
            owner_player_pda,
            &mut used_new_page,
        )?;
    }

    // Activator always joins queue (if not already in tail page)
    enqueue_into_tail(
        level,
        &mut accounts.level_pool,
        payer,
        system_program_acc,
        &accounts.tail_page,
        &accounts.new_page,
        accounts.player.key(),
        &mut used_new_page,
    )?;

    Ok(())
}

// =============================================================
// 7) HANDLERS
// =============================================================

pub fn handle_init_config_v3(
    ctx: Context<InitializeConfigV3>,
    admin: Pubkey,
    treasury: Pubkey,
    _perc_admin: u8,
    _perc_ref1: u8,
    _perc_ref2: u8,
    _perc_ref3: u8,
    _perc_treasury: u8,
    base_price_lamports: u64,
    price_ratio: u8,
    min_entry_delay: u32,
    auto_recycle: bool,
    slots_to_recycle: u8,
    max_levels: u8,
) -> Result<()> {
    require!(max_levels > 0 && max_levels <= MAX_LEVEL, CustomError::InvalidLevel);
    require!(
        PERC_OWNER + PERC_REF1 + PERC_REF2 + PERC_REF3 + PERC_TREASURY_BASE == PERC_TOTAL,
        CustomError::InvalidDistribution
    );

    let cfg = &mut ctx.accounts.config_v3;
    cfg.admin = admin;
    cfg.treasury = treasury;

    cfg.perc_admin = PERC_OWNER as u8;
    cfg.perc_ref1 = PERC_REF1 as u8;
    cfg.perc_ref2 = PERC_REF2 as u8;
    cfg.perc_ref3 = PERC_REF3 as u8;
    cfg.perc_treasury = PERC_TREASURY_BASE as u8;

    cfg.base_price_lamports = base_price_lamports;
    cfg.price_ratio = price_ratio.max(1);
    cfg.min_entry_delay = min_entry_delay;
    cfg.auto_recycle = auto_recycle;
    cfg.slots_to_recycle = slots_to_recycle.max(3);
    cfg.max_levels = max_levels;
    cfg.bump = ctx.bumps.config_v3;
    cfg.version = 3;
    cfg.version_minor = 12;

    let stats = &mut ctx.accounts.global_stats;
    stats.total_players = 0;
    stats.last_player = Pubkey::default();
    stats.bump = ctx.bumps.global_stats;

    emit!(ConfigInitialized {
        admin,
        treasury,
        timestamp: Clock::get()?.unix_timestamp,
    });
    Ok(())
}

pub fn handle_create_player_v3(ctx: Context<CreatePlayerV3>, referrer: Option<Pubkey>) -> Result<()> {
    let player = &mut ctx.accounts.player;
    let cfg = &ctx.accounts.config_v3;
    let stats = &mut ctx.accounts.global_stats;

    player.authority = ctx.accounts.authority.key();
    player.bump = ctx.bumps.player;
    player.created_at = Clock::get()?.unix_timestamp;
    player.games_played = 0;

    if let Some(r) = referrer {
        if let Some(ref_ai) = ctx.accounts.referrer_player.as_ref() {
            require_keys_eq!(ref_ai.key(), r, CustomError::Unauthorized);
            let data = ref_ai.try_borrow_data()?;
            let mut slice: &[u8] = &data;
            let ref_player =
                Player::try_deserialize(&mut slice).map_err(|_| error!(CustomError::AccountCastError))?;

            player.upline1 = ref_player.authority;
            player.upline2 = ref_player.upline1;
            player.upline3 = ref_player.upline2;
        } else {
            player.upline1 = r;
            player.upline2 = cfg.admin;
            player.upline3 = cfg.admin;
        }
    } else {
        if stats.total_players == 0 {
            player.upline1 = cfg.admin;
            player.upline2 = cfg.admin;
            player.upline3 = cfg.admin;
        } else {
            let prev = stats.last_player;
            player.upline1 = prev;
            player.upline2 = cfg.admin;
            player.upline3 = cfg.admin;
        }
    }

    stats.last_player = player.authority;
    stats.total_players = stats.total_players.saturating_add(1);

    emit!(PlayerCreated {
        authority: player.authority,
        timestamp: player.created_at,
    });
    Ok(())
}

pub fn handle_activate_level_v3(
    mut ctx: Context<ActivateLevelV3>,
    level: u8,
    price_lamports: u64,
    nonce: u64,
) -> Result<()> {
    let accounts = &mut ctx.accounts;

    // Auth + bounds
    require_keys_eq!(
        accounts.player.authority,
        accounts.authority.key(),
        CustomError::Unauthorized
    );
    require!(level >= 1 && level <= MAX_LEVEL, CustomError::InvalidLevel);

    let cfg = &accounts.config_v3;
    let expected = expected_price_from_cfg(level, cfg);
    require!(expected > 0 && price_lamports == expected, CustomError::InvalidPrice);

    // =========================================================
    // CRITICAL FIX (SPV Block I-2):
    // Reject repeated activation of already active level
    // BEFORE any transfer/enqueue/CPI/queue mutations.
    // =========================================================
    require!(
        accounts.level_state.activated_at == 0,
        CustomError::AlreadyActivated
    );

    let now = Clock::get()?.unix_timestamp;

    if cfg.min_entry_delay > 0 {
        let since = now
            .checked_sub(accounts.player.created_at)
            .ok_or(CustomError::Overflow)?;
        require!(
            (since as u64) >= (cfg.min_entry_delay as u64),
            CustomError::MinEntryDelay
        );
    }

    // TxGuard (replay protection)
    {
        let tg = &mut accounts.tx_guard;
        tg.nonce = nonce;
        tg.executed_at = now;
        tg.bump = ctx.bumps.tx_guard;
    }

    // LevelState activator init (activated_at only once)
    {
        let ls_me = &mut accounts.level_state;

        // (activated_at guaranteed == 0 from guard above)
        ls_me.player = accounts.player.key();
        ls_me.authority = accounts.authority.key();
        ls_me.level = level;
        ls_me.bump = ctx.bumps.level_state;
        ls_me.activated_at = now;
        ls_me.cycles = 0;
        ls_me.slots_filled = 0;
        ls_me.head_page = None;
        ls_me.tail_page = None;

        emit!(LevelActivated {
            owner: ls_me.authority,
            level,
            lamports: expected,
            timestamp: now,
        });
    }

    // LevelPool init/check (state only)
    if accounts.level_pool.level == 0 {
        accounts.level_pool.config = accounts.config_v3.key();
        accounts.level_pool.level = level;
        accounts.level_pool.bump = ctx.bumps.level_pool;
        accounts.level_pool.head_page = None;
        accounts.level_pool.tail_page = None;
        accounts.level_pool.total_enqueued = 0;
        accounts.level_pool.total_dequeued = 0;
    }
    require_eq!(accounts.level_pool.level, level, CustomError::InvalidLevel);
    require_keys_eq!(accounts.level_pool.config, accounts.config_v3.key());

    // Branch: first activation creates first page, 100% -> treasury
    if accounts.level_pool.head_page.is_none() {
        return process_first_activation(accounts, level, expected);
    }

    // Branch: existing queue (normal payouts with X3 logic)
    process_existing_activation(accounts, level, expected, now)
}

// legacy placeholders (keep IDL stable)
pub fn handle_recycle_level_v3(
    _ctx: Context<RecycleLevelV3>,
    _level: u8,
    _price_lamports: u64,
    _nonce: u64,
) -> Result<()> {
    Ok(())
}
pub fn handle_claim_slot(_ctx: Context<ClaimSlot>) -> Result<()> {
    Ok(())
}
pub fn handle_enqueue_player(_ctx: Context<EnqueuePlayer>) -> Result<()> {
    Ok(())
}
pub fn handle_dequeue_owner(_ctx: Context<DequeueOwner>) -> Result<Pubkey> {
    Ok(Pubkey::default())
}

pub fn handle_register_player(
    ctx: Context<RegisterPlayer>,
    referrer: Option<Pubkey>,
    nonce: u64,
) -> Result<()> {
    let tg = &mut ctx.accounts.tx_guard;
    tg.nonce = nonce;
    tg.executed_at = Clock::get()?.unix_timestamp;
    tg.bump = ctx.bumps.tx_guard;

    let player = &mut ctx.accounts.player;
    let cfg = &ctx.accounts.config_v3;
    let stats = &mut ctx.accounts.global_stats;

    player.authority = ctx.accounts.authority.key();
    player.bump = ctx.bumps.player;
    player.created_at = Clock::get()?.unix_timestamp;
    player.games_played = 0;

    if let Some(r) = referrer {
        if let Some(ref_ai) = ctx.accounts.referrer_player.as_ref() {
            require_keys_eq!(ref_ai.key(), r, CustomError::Unauthorized);
            let data = ref_ai.try_borrow_data()?;
            let mut slice: &[u8] = &data;
            let ref_player =
                Player::try_deserialize(&mut slice).map_err(|_| error!(CustomError::AccountCastError))?;

            player.upline1 = ref_player.authority;
            player.upline2 = ref_player.upline1;
            player.upline3 = ref_player.upline2;
        } else {
            player.upline1 = r;
            player.upline2 = cfg.admin;
            player.upline3 = cfg.admin;
        }
    } else {
        if stats.total_players == 0 {
            player.upline1 = cfg.admin;
            player.upline2 = cfg.admin;
            player.upline3 = cfg.admin;
        } else {
            let prev = stats.last_player;
            player.upline1 = prev;
            player.upline2 = cfg.admin;
            player.upline3 = cfg.admin;
        }
    }

    stats.last_player = player.authority;
    stats.total_players = stats.total_players.saturating_add(1);

    emit!(PlayerCreated {
        authority: player.authority,
        timestamp: player.created_at,
    });
    Ok(())
}

// =============================================================
// 11) CONTEXTS
// =============================================================

#[derive(Accounts)]
pub struct InitializeConfigV3<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + ConfigV3::SIZE,
        seeds = [b"config_v3_new"],
        bump
    )]
    pub config_v3: Account<'info, ConfigV3>,

    #[account(
        init,
        payer = payer,
        space = 8 + GlobalStats::SIZE,
        seeds = [b"global_stats_v1"],
        bump
    )]
    pub global_stats: Account<'info, GlobalStats>,

    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreatePlayerV3<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Player::SIZE,
        seeds = [b"player", authority.key().as_ref()],
        bump
    )]
    pub player: Account<'info, Player>,

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config_v3_new"],
        bump = config_v3.bump
    )]
    pub config_v3: Account<'info, ConfigV3>,

    #[account(
        mut,
        seeds = [b"global_stats_v1"],
        bump = global_stats.bump
    )]
    pub global_stats: Account<'info, GlobalStats>,

    /// CHECK:
    pub referrer_player: Option<AccountInfo<'info>>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(level: u8, _price_lamports: u64, nonce: u64)]
pub struct ActivateLevelV3<'info> {
    #[account(mut)]
    pub player: Account<'info, Player>,

    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + LevelState::SIZE,
        seeds = [b"lvl", player.key().as_ref(), &[level]],
        bump
    )]
    pub level_state: Account<'info, LevelState>,

    #[account(
        init,
        payer = authority,
        space = 8 + TxGuard::SIZE,
        seeds = [b"tx", player.key().as_ref(), b"\x01", &[level], &nonce.to_le_bytes()],
        bump
    )]
    pub tx_guard: Account<'info, TxGuard>,

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config_v3_new"],
        bump = config_v3.bump
    )]
    pub config_v3: Account<'info, ConfigV3>,

    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + LevelPool::SIZE,
        seeds = [b"level_pool_v1", config_v3.key().as_ref(), &[level]],
        bump
    )]
    pub level_pool: Account<'info, LevelPool>,

    /// CHECK:
    #[account(mut)]
    pub admin_account: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub treasury_account: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub ref1_account: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub ref2_account: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub ref3_account: UncheckedAccount<'info>,

    /// CHECK:
    #[account(mut)]
    pub tail_page: AccountInfo<'info>,
    /// CHECK:
    #[account(mut)]
    pub new_page: AccountInfo<'info>,
    /// CHECK:
    #[account(mut)]
    pub head_page: AccountInfo<'info>,

    /// CHECK:
    #[account(mut)]
    pub owner_player: AccountInfo<'info>,

    /// CHECK:
    #[account(mut)]
    pub owner_level_state: AccountInfo<'info>,

    /// CHECK:
    #[account(mut)]
    pub owner_wallet: UncheckedAccount<'info>,

    /// CHECK:
    pub ref1_level_state: Option<AccountInfo<'info>>,
    /// CHECK:
    pub ref2_level_state: Option<AccountInfo<'info>>,
    /// CHECK:
    pub ref3_level_state: Option<AccountInfo<'info>>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(level: u8, _price_lamports: u64, nonce: u64)]
pub struct RecycleLevelV3<'info> {
    #[account(mut)]
    pub player: Account<'info, Player>,

    #[account(
        init,
        payer = authority,
        space = 8 + TxGuard::SIZE,
        seeds = [b"tx", player.key().as_ref(), b"\x02", &[level], &nonce.to_le_bytes()],
        bump
    )]
    pub tx_guard: Account<'info, TxGuard>,

    #[account(
        mut,
        seeds = [b"lvl", player.key().as_ref(), &[level]],
        bump = level_state.bump,
        has_one = authority
    )]
    pub level_state: Account<'info, LevelState>,

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"config_v3_new"],
        bump = config_v3.bump
    )]
    pub config_v3: Account<'info, ConfigV3>,

    /// CHECK:
    #[account(mut)]
    pub admin_account: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub treasury_account: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub ref1_account: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub ref2_account: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub ref3_account: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimSlot<'info> {
    #[account(
        mut,
        seeds = [b"lvl", owner_player.key().as_ref(), &[level_state.level]],
        bump = level_state.bump
    )]
    pub level_state: Account<'info, LevelState>,

    /// CHECK:
    #[account(mut)]
    pub owner_player: AccountInfo<'info>,

    #[account(mut)]
    pub activator: Signer<'info>,

    #[account(
        seeds = [b"config_v3_new"],
        bump = config_v3.bump
    )]
    pub config_v3: Account<'info, ConfigV3>,

    /// CHECK:
    #[account(mut)]
    pub admin_account: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub treasury_account: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub ref1_account: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub ref2_account: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub ref3_account: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EnqueuePlayer<'info> {
    #[account(
        mut,
        has_one = authority,
        seeds = [b"lvl", player.key().as_ref(), &[level_state.level]],
        bump = level_state.bump
    )]
    pub level_state: Account<'info, LevelState>,

    pub player: Account<'info, Player>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK:
    #[account(mut)]
    pub tail_page: AccountInfo<'info>,
    /// CHECK:
    #[account(mut)]
    pub new_page: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DequeueOwner<'info> {
    #[account(
        mut,
        has_one = authority,
        seeds = [b"lvl", player.key().as_ref(), &[level_state.level]],
        bump = level_state.bump
    )]
    pub level_state: Account<'info, LevelState>,

    pub player: Account<'info, Player>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK:
    #[account(mut)]
    pub head_page: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(referrer: Option<Pubkey>, nonce: u64)]
pub struct RegisterPlayer<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Player::SIZE,
        seeds = [b"player", authority.key().as_ref()],
        bump
    )]
    pub player: Account<'info, Player>,

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + TxGuard::SIZE,
        seeds = [
            b"tx".as_ref(),
            b"register".as_ref(),
            authority.key().as_ref(),
            &nonce.to_le_bytes()
        ],
        bump
    )]
    pub tx_guard: Account<'info, TxGuard>,

    #[account(
        mut,
        seeds = [b"config_v3_new"],
        bump = config_v3.bump
    )]
    pub config_v3: Account<'info, ConfigV3>,

    #[account(
        mut,
        seeds = [b"global_stats_v1"],
        bump = global_stats.bump
    )]
    pub global_stats: Account<'info, GlobalStats>,

    /// CHECK:
    pub referrer_player: Option<AccountInfo<'info>>,

    pub system_program: Program<'info, System>,
}

