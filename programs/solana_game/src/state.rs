use anchor_lang::prelude::*;

/// Этот модуль реэкспортирует аккаунты,
/// определённые в `processor.rs`, чтобы они были
/// доступны как `solana_game::state::*` и попадали в IDL.

pub use crate::processor::{
    ConfigV3,
    Player,
    LevelState,
    TxGuard,
    GlobalStats,
};
