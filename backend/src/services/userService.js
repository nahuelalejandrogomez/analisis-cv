const db = require('../config/database');

const ALLOWED_DOMAIN = '@redb.ee';

const userService = {
  /**
   * Verifica si el email pertenece al dominio permitido
   */
  isAllowedEmail(email) {
    return email && email.toLowerCase().endsWith(ALLOWED_DOMAIN);
  },

  /**
   * Crea o actualiza un usuario después de autenticación con Google
   * Solo permite emails @redb.ee
   */
  async createOrUpdateUser(googleUserData) {
    const { email, name, picture, google_id } = googleUserData;

    // Verificar dominio
    if (!this.isAllowedEmail(email)) {
      console.error(`[UserService] Email no permitido: ${email}`);
      throw new Error(`Solo empleados de Redbee (${ALLOWED_DOMAIN}) pueden acceder`);
    }

    try {
      console.log(`[UserService] Creando/actualizando usuario: ${email}`);

      const result = await db.query(
        `INSERT INTO users (email, name, picture, google_id, last_login)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (email) DO UPDATE SET
           name = EXCLUDED.name,
           picture = EXCLUDED.picture,
           google_id = EXCLUDED.google_id,
           last_login = NOW()
         RETURNING id, email, name, picture;`,
        [email.toLowerCase(), name, picture, google_id]
      );

      console.log(`[UserService] Usuario guardado: ${result.rows[0].email}`);
      return result.rows[0];
    } catch (error) {
      console.error('[UserService] Error guardando usuario:', error.message);
      throw error;
    }
  },

  /**
   * Obtiene un usuario por su email
   */
  async getUserByEmail(email) {
    try {
      const result = await db.query(
        'SELECT id, email, name, picture FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('[UserService] Error obteniendo usuario:', error.message);
      throw error;
    }
  },

  /**
   * Obtiene un usuario por su ID
   */
  async getUserById(id) {
    try {
      const result = await db.query(
        'SELECT id, email, name, picture FROM users WHERE id = $1',
        [id]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('[UserService] Error obteniendo usuario por ID:', error.message);
      throw error;
    }
  },
};

module.exports = { userService };
