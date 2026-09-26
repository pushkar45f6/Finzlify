export interface PasswordResetMessage {
  recipient: string;
  resetUrl: string;
  expiresAt: string;
}

export interface PasswordResetDelivery {
  send(message: PasswordResetMessage): Promise<void>;
}

export const passwordResetDelivery: PasswordResetDelivery = {
  async send(_message) {
    // TODO: connect a delivery channel when Cloudflare Email Service is available.
    // Never return or log the reset URL/token from this boundary.
  },
};