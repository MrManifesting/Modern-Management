import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

interface GoogleCredentials {
  installed: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
    auth_uri: string;
    token_uri: string;
  };
}

interface TokenData {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date?: number;
}

export class GoogleOAuthService {
  private oauth2Client: any;
  private credentials: GoogleCredentials;

  constructor() {
    this.loadCredentials();
    this.initializeOAuth();
  }

  private loadCredentials() {
    try {
      const credentialsPath = path.join(process.cwd(), 'google-credentials.json');
      const credentialsContent = fs.readFileSync(credentialsPath, 'utf8');
      this.credentials = JSON.parse(credentialsContent);
    } catch (error) {
      console.error('Error loading Google credentials:', error);
      throw new Error('Google credentials file not found or invalid');
    }
  }

  private initializeOAuth() {
    const { client_id, client_secret, redirect_uris } = this.credentials.installed;
    
    this.oauth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0] || 'http://localhost'
    );
  }

  getAuthUrl(scopes: string[] = ['https://www.googleapis.com/auth/spreadsheets']): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  async getAccessToken(code: string): Promise<TokenData> {
    try {
      const { tokens } = await this.oauth2Client.getAccessToken(code);
      this.oauth2Client.setCredentials(tokens);
      return tokens as TokenData;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenData> {
    try {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return credentials as TokenData;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  getAuthenticatedClient(tokens: TokenData) {
    const client = new google.auth.OAuth2(
      this.credentials.installed.client_id,
      this.credentials.installed.client_secret,
      this.credentials.installed.redirect_uris[0]
    );
    
    client.setCredentials(tokens);
    return client;
  }

  async getSheetsService(tokens: TokenData) {
    const authClient = this.getAuthenticatedClient(tokens);
    return google.sheets({ version: 'v4', auth: authClient });
  }

  isTokenExpired(token: TokenData): boolean {
    if (!token.expiry_date) return false;
    return Date.now() >= token.expiry_date;
  }
}

export const googleOAuth = new GoogleOAuthService();