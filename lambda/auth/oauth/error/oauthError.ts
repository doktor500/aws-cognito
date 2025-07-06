export class OauthError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'OauthError';
    this.statusCode = statusCode;
  }
}
