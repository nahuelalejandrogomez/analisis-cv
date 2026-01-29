const { OAuth2Client } = require('google-auth-library');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/auth/google/callback';

const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

const googleAuthService = {
  /**
   * Genera la URL de login de Google OAuth
   */
  getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'select_account', // Siempre muestra selector de cuenta
    });
  },

  /**
   * Canjea el código de autorización por tokens y obtiene datos del usuario
   */
  async exchangeCodeForToken(code) {
    try {
      console.log('[GoogleAuth] Canjeando código por token...');

      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Verificar el id_token para obtener datos del usuario
      const ticket = await oauth2Client.verifyIdToken({
        idToken: tokens.id_token,
        audience: GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      console.log(`[GoogleAuth] Usuario autenticado: ${payload.email}`);

      return {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        google_id: payload.sub,
      };
    } catch (error) {
      console.error('[GoogleAuth] Error canjeando código:', error.message);
      throw error;
    }
  },
};

module.exports = { googleAuthService };
