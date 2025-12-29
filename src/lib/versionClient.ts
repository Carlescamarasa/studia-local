import { supabase } from './supabaseClient';

/**
 * Cliente para gestionar versiones de la aplicación
 */
export const versionClient = {
  /**
   * Obtiene la versión actual activa
   * @returns {Promise<Object|null>} Objeto version_history con la versión activa o null
   */
  async getCurrentVersion() {
    try {
      // Obtener app_meta con la versión actual
      const { data: appMeta, error: metaError } = await supabase
        .from('app_meta')
        .select('current_version_id')
        .single();

      if (metaError) {
        if (metaError.code === 'PGRST116') {
          // No hay registro en app_meta, retornar null
          return null;
        }
        throw metaError;
      }

      if (!appMeta?.current_version_id) {
        return null;
      }

      // Obtener la versión actual
      const { data: version, error: versionError } = await supabase
        .from('version_history')
        .select('*')
        .eq('id', appMeta.current_version_id)
        .single();

      if (versionError) {
        if (versionError.code === 'PGRST116') {
          return null;
        }
        throw versionError;
      }

      return version;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Lista todo el historial de versiones ordenado por fecha descendente
   * @returns {Promise<Array>} Array de objetos version_history
   */
  async listHistory() {
    try {
      // Primero obtener las versiones
      const { data: versions, error: versionsError } = await supabase
        .from('version_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (versionsError) throw versionsError;
      if (!versions || versions.length === 0) return [];

      // Obtener los IDs de autores únicos
      const authorIds = [...new Set(versions.map(v => v.author_id).filter(Boolean))];

      // Obtener los perfiles de los autores
      let authorsMap = new Map();
      if (authorIds.length > 0) {
        const { data: authors, error: authorsError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', authorIds);

        if (!authorsError && authors) {
          authors.forEach(author => {
            authorsMap.set(author.id, author);
          });
        }
      }

      // Combinar versiones con sus autores
      return versions.map(version => ({
        ...version,
        author: version.author_id ? authorsMap.get(version.author_id) || null : null,
      }));
    } catch (error) {
      throw error;
    }
  },

  /**
   * Crea una nueva versión
   * @param {Object} params
   * @param {string} params.version - Versión (ej: "v0.9-beta")
   * @param {string} [params.codename] - Nombre código (ej: "Aurora")
   * @param {string} [params.notes] - Notas en markdown
   * @param {string} params.authorId - ID del autor (auth.uid())
   * @returns {Promise<Object>} Versión creada
   */
  async createVersion({ version, codename, notes, authorId }) {
    try {
      const { data, error } = await supabase
        .from('version_history')
        .insert({
          version: version.trim(),
          codename: codename?.trim() || null,
          notes: notes?.trim() || null,
          author_id: authorId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Activa una versión existente (actualiza app_meta.current_version_id)
   * @param {string} versionId - ID de la versión a activar
   * @returns {Promise<Object>} app_meta actualizado
   */
  async activateVersion(versionId) {
    try {
      // Primero verificar que la versión existe
      const { data: version, error: versionError } = await supabase
        .from('version_history')
        .select('id')
        .eq('id', versionId)
        .single();

      if (versionError || !version) {
        throw new Error('Versión no encontrada');
      }

      // Obtener el registro de app_meta (solo hay uno)
      const { data: existingMeta, error: fetchError } = await supabase
        .from('app_meta')
        .select('id')
        .single();

      if (fetchError) {
        // Si no existe, crear el registro
        const { data: newMeta, error: createError } = await supabase
          .from('app_meta')
          .insert({
            current_version_id: versionId,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) throw createError;
        return newMeta;
      }

      // Actualizar app_meta usando el ID del registro existente
      const { data: appMeta, error: metaError } = await supabase
        .from('app_meta')
        .update({
          current_version_id: versionId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingMeta.id)
        .select()
        .single();

      if (metaError) throw metaError;
      return appMeta;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Realiza un upsert de una versión basado en el nombre de la versión
   * @param {Object} params
   * @param {string} params.version - Nombre de la versión (ej: "v0.92-beta")
   * @param {string} [params.commit_hash] - Hash del commit
   * @param {string} [params.git_author] - Autor del commit
   * @param {string} [params.build_date] - Fecha de compilación
   * @param {Object} [params.release_notes] - Objeto JSON con las notas
   * @param {string} [params.author_id] - ID del usuario que sincroniza
   * @returns {Promise<Object>} Versión upsertada
   */
  async upsertVersion({ version, commit_hash, git_author, build_date, release_notes, author_id }) {
    try {
      // Intentar encontrar si ya existe por el campo 'version'
      const { data: existing, error: findError } = await supabase
        .from('version_history')
        .select('id')
        .eq('version', version)
        .maybeSingle();

      const payload = {
        version: version.trim(),
        commit_hash,
        git_author,
        build_date,
        release_notes,
        // Note: updated_at removed - column may not exist in database
      };

      if (author_id) {
        payload.author_id = author_id;
      }

      let result;
      if (existing) {
        const { data, error } = await supabase
          .from('version_history')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from('version_history')
          .insert({
            ...payload,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (error) throw error;
        result = data;
      }

      return result;
    } catch (error) {
      throw error;
    }
  },
};

