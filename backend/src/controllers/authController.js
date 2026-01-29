const { googleAuthService } = require('../services/googleAuthService');
const { userService } = require('../services/userService');
const { jwtService } = require('../services/jwtService');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * GET /auth/google/login-url
 * Retorna la URL para iniciar el flujo OAuth con Google
 */
async function googleLoginUrl(req, res) {
  try {
    const url = googleAuthService.getAuthUrl();
    console.log('[Auth] URL de login generada');
    res.json({ loginUrl: url });
  } catch (error) {
    console.error('[Auth] Error generando URL de login:', error.message);
    res.status(500).json({ error: 'Error generando URL de login' });
  }
}

/**
 * GET /auth/google/callback
 * Callback de Google OAuth - procesa el código y genera JWT
 */
async function googleCallback(req, res) {
  const { code, error: googleError } = req.query;

  // Google puede enviar error si el usuario cancela
  if (googleError) {
    console.log(`[Auth] Usuario canceló login: ${googleError}`);
    return res.redirect(`${FRONTEND_URL}?error=login_cancelled`);
  }

  if (!code) {
    console.error('[Auth] No se recibió código de Google');
    return res.redirect(`${FRONTEND_URL}?error=no_code`);
  }

  try {
    console.log('[Auth] Procesando callback de Google...');

    // 1. Canjear código por datos del usuario
    const googleUserData = await googleAuthService.exchangeCodeForToken(code);
    console.log(`[Auth] Usuario de Google: ${googleUserData.email}`);

    // 2. Verificar que es @redb.ee
    if (!userService.isAllowedEmail(googleUserData.email)) {
      console.log(`[Auth] Email no permitido: ${googleUserData.email}`);
      return res.redirect(`${FRONTEND_URL}?error=unauthorized_domain`);
    }

    // 3. Crear o actualizar usuario en BD
    const user = await userService.createOrUpdateUser(googleUserData);
    console.log(`[Auth] Usuario guardado: ${user.email}`);

    // 4. Generar JWT token
    const token = jwtService.generateToken(user);
    console.log('[Auth] Token JWT generado');

    // 5. Redirigir al frontend con el token
    const redirectUrl = `${FRONTEND_URL}/callback?token=${token}`;
    console.log(`[Auth] Redirigiendo a: ${FRONTEND_URL}/callback`);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('[Auth] Error en callback:', error.message);
    res.redirect(`${FRONTEND_URL}?error=auth_failed`);
  }
}

/**
 * POST /auth/logout
 * Endpoint de logout (el logout real es client-side)
 */
function logout(req, res) {
  console.log(`[Auth] Logout: ${req.user?.email || 'unknown'}`);
  res.json({ message: 'Logout exitoso' });
}

/**
 * GET /auth/me
 * Retorna los datos del usuario autenticado
 */
function getCurrentUser(req, res) {
  res.json({ user: req.user });
}

module.exports = {
  googleLoginUrl,
  googleCallback,
  logout,
  getCurrentUser,
};
