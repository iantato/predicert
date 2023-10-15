use anchor_lang::prelude::*;

declare_id!("GFXDqCwuMWRFNBf55KLFHR36gRN335oi9iNja6CaCsw9");

#[program]
pub mod sendvote {
    use super::*;

    pub fn add_message(ctx: Context<AddMessage>, msg: String) -> Result<()> {
        let message_account = &mut ctx.accounts.message_account;
        message_account.msg = msg;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(msg: String)]
pub struct AddMessage<'info> {
    #[account
      (
        init,
        payer=signer,
        space = 50,
        seeds=[signer.key().as_ref()],
        bump
     )
    ]
    pub message_account: Account<'info, MessageAccount>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,

}

#[account]
pub struct MessageAccount {
    msg: String,
}