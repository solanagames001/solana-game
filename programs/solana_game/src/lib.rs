#![allow(clippy::too_many_arguments)]

// ============================================================
// MAINNET FINAL — v3.12 (PRODUCTION)
// Program: solana_game
// Version: 3.12
// 
// Security: Overflow protection, X3 threshold min 3
// ============================================================

use anchor_lang::prelude::*;
use solana_security_txt::security_txt;

// ⚠️ Program ID ДОЛЖЕН совпадать с Anchor.toml и on-chain
declare_id!("Bk5wQdDbfe2UGrrjBsDUJFPjH9mqB5JHZymrp4u95458");

// Security.txt для on-chain доступа
#[cfg(not(feature = "no-entrypoint"))]
security_txt! {
    name: "Solana Game",
    project_url: "https://github.com/solanagames001/solana-game",
    contacts: "mailto:security@example.com,https://github.com/solanagames001/solana-game/security",
    policy: "https://github.com/solanagames001/solana-game/security/policy",
    source_code: "https://github.com/solanagames001/solana-game",
    auditors: "None",
    expiration_date: "2026-12-31"
}

// ------------------------------------------------------------
// Modules
// ------------------------------------------------------------
mod processor;
mod state;

use processor::*;
use state::*;

// ============================================================
// PROGRAM ROUTER (Anchor entrypoints)
// ============================================================

#[program]
pub mod solana_game {
    use super::*;

    // --------------------------------------------------------
    // CONFIG
    // --------------------------------------------------------

    pub fn initialize_config_v3(
        ctx: Context<InitializeConfigV3>,
        admin: Pubkey,
        treasury: Pubkey,
        perc_admin: u8,
        perc_ref1: u8,
        perc_ref2: u8,
        perc_ref3: u8,
        perc_treasury: u8,
        base_price_lamports: u64,
        price_ratio: u8,
        min_entry_delay: u32,
        auto_recycle: bool,
        slots_to_recycle: u8,
        max_levels: u8,
    ) -> Result<()> {
        handle_init_config_v3(
            ctx,
            admin,
            treasury,
            perc_admin,
            perc_ref1,
            perc_ref2,
            perc_ref3,
            perc_treasury,
            base_price_lamports,
            price_ratio,
            min_entry_delay,
            auto_recycle,
            slots_to_recycle,
            max_levels,
        )
    }

    // --------------------------------------------------------
    // PLAYER
    // --------------------------------------------------------

    pub fn create_player_v3(
        ctx: Context<CreatePlayerV3>,
        referrer: Option<Pubkey>,
    ) -> Result<()> {
        handle_create_player_v3(ctx, referrer)
    }

    pub fn register_player(
        ctx: Context<RegisterPlayer>,
        referrer: Option<Pubkey>,
        nonce: u64,
    ) -> Result<()> {
        handle_register_player(ctx, referrer, nonce)
    }

    // --------------------------------------------------------
    // LEVELS
    // --------------------------------------------------------

    pub fn activate_level_v3(
        ctx: Context<ActivateLevelV3>,
        level: u8,
        price_lamports: u64,
        nonce: u64,
    ) -> Result<()> {
        handle_activate_level_v3(ctx, level, price_lamports, nonce)
    }

    pub fn recycle_level_v3(
        ctx: Context<RecycleLevelV3>,
        level: u8,
        price_lamports: u64,
        nonce: u64,
    ) -> Result<()> {
        handle_recycle_level_v3(ctx, level, price_lamports, nonce)
    }

    // --------------------------------------------------------
    // QUEUE (legacy / reserved)
    // --------------------------------------------------------

    pub fn claim_slot(ctx: Context<ClaimSlot>) -> Result<()> {
        handle_claim_slot(ctx)
    }

    pub fn enqueue_player(ctx: Context<EnqueuePlayer>) -> Result<()> {
        handle_enqueue_player(ctx)
    }

    pub fn dequeue_owner(ctx: Context<DequeueOwner>) -> Result<Pubkey> {
        handle_dequeue_owner(ctx)
    }
}

// ============================================================
// EXPORT STATE TO IDL (Anchor requires this)
// ============================================================

// Аккаунты из state.rs
pub use state::{
    ConfigV3,
    Player,
    LevelState,
    TxGuard,
    GlobalStats,
};

// Аккаунты очереди/пула реально объявлены в processor.rs (по rustc подсказке)
pub use processor::{
    LevelPool,
    QueuePage,
};

// Anchor IDL hack — гарантирует, что аккаунты попадут в IDL
#[account] pub struct _IncludeConfigV3(pub ConfigV3);
#[account] pub struct _IncludePlayer(pub Player);
#[account] pub struct _IncludeLevelState(pub LevelState);
#[account] pub struct _IncludeTxGuard(pub TxGuard);
#[account] pub struct _IncludeGlobalStats(pub GlobalStats);
#[account] pub struct _IncludeLevelPool(pub LevelPool);
#[account] pub struct _IncludeQueuePage(pub QueuePage);

// ============================================================
// EXPORT CONTEXTS TO IDL
// ============================================================

pub use processor::{
    InitializeConfigV3,
    CreatePlayerV3,
    ActivateLevelV3,
    RecycleLevelV3,
    ClaimSlot,
    EnqueuePlayer,
    DequeueOwner,
    RegisterPlayer,
};
