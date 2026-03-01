-- AddColumn reset_token and reset_token_expires_at to usuarios
ALTER TABLE "usuarios" ADD COLUMN "reset_token"            VARCHAR(255);
ALTER TABLE "usuarios" ADD COLUMN "reset_token_expires_at" TIMESTAMPTZ(6);
