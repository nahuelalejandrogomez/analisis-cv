import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import UserFormModal from '../components/admin/UserFormModal';
import ChangePasswordModal from '../components/admin/ChangePasswordModal';
import * as adminApi from '../api/adminApi';
import '../styles/admin.css';

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [passwordUser, setPasswordUser] = useState(null);
  const { user: currentUser, logout } = useAuth();

  const loadUsers = useCallback(async () => {
    try {
      setError(null);
      const data = await adminApi.getUsers();
      setUsers(data.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreate = async (userData) => {
    await adminApi.createUser(userData);
    setShowCreateModal(false);
    loadUsers();
  };

  const handleUpdate = async (userData) => {
    await adminApi.updateUser(editingUser.id, userData);
    setEditingUser(null);
    loadUsers();
  };

  const handleChangePassword = async (password) => {
    await adminApi.changePassword(passwordUser.id, password);
    setPasswordUser(null);
  };

  const handleToggleActive = async (userId) => {
    try {
      await adminApi.toggleUserActive(userId);
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (userId, userName) => {
    if (!window.confirm(`¿Eliminar al usuario "${userName}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      await adminApi.deleteUser(userId);
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <img
              src="/Logos/REDBEE-MARCA.png"
              alt="Redbee Logo"
              className="logo-image"
            />
            <div className="logo-text">
              <h1>Panel de Administración</h1>
              <span className="brand">by Redbee</span>
            </div>
          </div>
          <div className="header-actions">
            <div className="user-info">
              <span className="user-name">{currentUser?.name}</span>
              <span className="user-role-badge role-administrator">Admin</span>
            </div>
            <button className="btn btn-secondary" onClick={logout}>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="admin-toolbar">
          <h2>Gestión de Usuarios</h2>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            + Nuevo Usuario
          </button>
        </div>

        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError(null)}>Cerrar</button>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <span>Cargando usuarios...</span>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Creado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className={!u.is_active ? 'row-inactive' : ''}>
                    <td className="td-name">{u.name}</td>
                    <td className="td-email">{u.email}</td>
                    <td>
                      <span className={`user-role-badge role-${u.role}`}>
                        {u.role === 'administrator' ? 'Administrator' : 'Recruiter'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-indicator ${u.is_active ? 'active' : 'inactive'}`}>
                        {u.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="td-date">
                      {new Date(u.created_at).toLocaleDateString('es-AR')}
                    </td>
                    <td className="td-actions">
                      <button
                        className="btn-action btn-edit"
                        onClick={() => setEditingUser(u)}
                        title="Editar"
                      >
                        Editar
                      </button>
                      <button
                        className="btn-action btn-password"
                        onClick={() => setPasswordUser(u)}
                        title="Cambiar contraseña"
                      >
                        Password
                      </button>
                      {u.id !== currentUser?.id && (
                        <>
                          <button
                            className={`btn-action ${u.is_active ? 'btn-deactivate' : 'btn-activate'}`}
                            onClick={() => handleToggleActive(u.id)}
                            title={u.is_active ? 'Desactivar' : 'Activar'}
                          >
                            {u.is_active ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            className="btn-action btn-delete"
                            onClick={() => handleDelete(u.id, u.name)}
                            title="Eliminar"
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="6" className="empty-row">
                      No hay usuarios registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>CV Evaluator by Redbee - Panel de Administración</p>
      </footer>

      {showCreateModal && (
        <UserFormModal
          onSubmit={handleCreate}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {editingUser && (
        <UserFormModal
          user={editingUser}
          onSubmit={handleUpdate}
          onClose={() => setEditingUser(null)}
        />
      )}

      {passwordUser && (
        <ChangePasswordModal
          user={passwordUser}
          onSubmit={handleChangePassword}
          onClose={() => setPasswordUser(null)}
        />
      )}
    </div>
  );
}

export default AdminPanel;
