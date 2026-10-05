import ClienteRepository from '../repositories/cliente.repository.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  assertRequired,
} from '../utils/errors.util.js';

class ClienteService {
  /**
   * Obtiene clientes con paginación y búsqueda por keyword.
   */
  static async getAll({ page = 1, limit = 10, keyword = '' }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const { total, items } = await ClienteRepository.getAll({
      keyword,
      limit: limitNum,
      offset,
    });

    return {
      items,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * Búsqueda rápida optimizada para autocomplete / combobox de recepción.
   */
  static async search(keyword, limit = 8) {
    if (!keyword || String(keyword).trim().length === 0) {
      const { items } = await ClienteRepository.getAll({ limit: 10 });
      return items;
    }
    const { items } = await ClienteRepository.getAll({
      keyword: String(keyword).trim(),
      limit: Math.max(1, Math.min(25, parseInt(limit, 10) || 8)),
    });
    return items;
  }

  /**
   * Obtiene un cliente por su ID con sus acompañantes y reservas recientes.
   */
  static async getById(id) {
    assertRequired(id, 'El ID del cliente es requerido');
    const cliente = await ClienteRepository.getById(id);
    if (!cliente) {
      throw new NotFoundError('Cliente no encontrado');
    }
    return cliente;
  }

  /**
   * Obtiene cliente por Documento de identidad (cédula / pasaporte).
   */
  static async getByDocumento(documento) {
    assertRequired(documento, 'El documento es requerido');
    return await ClienteRepository.getByDocumento(documento);
  }

  /**
   * Valida que no existan acompañantes duplicados entre sí ni repetidos con el cliente titular.
   */
  static validarAcompanantes(titularDoc, titularNombre, acompanantes) {
    if (!Array.isArray(acompanantes) || acompanantes.length === 0) return;

    const cleanTitularDoc = titularDoc ? String(titularDoc).trim().toLowerCase() : null;
    const cleanTitularNombre = titularNombre ? String(titularNombre).trim().toLowerCase() : null;

    const seenDocs = new Map();
    const seenNames = new Map();

    for (let i = 0; i < acompanantes.length; i++) {
      const a = acompanantes[i];
      if (!a) continue;

      const aNombre = a.nombre ? String(a.nombre).trim() : '';
      const aDoc = a.documento ? String(a.documento).trim() : null;

      if (!aNombre) {
        throw new BadRequestError(`El acompañante #${i + 1} debe tener un nombre válido`);
      }

      const cleanName = aNombre.toLowerCase();
      const cleanDoc = aDoc ? aDoc.toLowerCase() : null;

      // 1. Validar que el acompañante no sea el mismo cliente titular por documento
      if (cleanDoc && cleanTitularDoc && cleanDoc === cleanTitularDoc) {
        throw new ConflictError(
          `El acompañante "${aNombre}" tiene el mismo documento (${aDoc}) que el cliente titular`
        );
      }

      // 2. Validar que el acompañante no sea el mismo cliente titular por nombre
      if (cleanTitularNombre && cleanName === cleanTitularNombre) {
        throw new ConflictError(
          `El acompañante "${aNombre}" no puede ser el mismo cliente titular`
        );
      }

      // 3. Validar duplicados entre acompañantes por documento
      if (cleanDoc) {
        if (seenDocs.has(cleanDoc)) {
          const prevIdx = seenDocs.get(cleanDoc);
          throw new ConflictError(
            `El documento "${aDoc}" está repetido entre el Acompañante #${prevIdx + 1} y el Acompañante #${i + 1}`
          );
        }
        seenDocs.set(cleanDoc, i);
      }

      // 4. Validar duplicados entre acompañantes por nombre
      if (seenNames.has(cleanName)) {
        const prevIdx = seenNames.get(cleanName);
        throw new ConflictError(
          `El acompañante "${aNombre}" está registrado más de una vez (Acompañante #${prevIdx + 1} y #${i + 1})`
        );
      }
      seenNames.set(cleanName, i);
    }
  }

  /**
   * Registra un nuevo cliente (y sus acompañantes iniciales si se proporcionan).
   */
  static async create(data) {
    const { documento, nombre, email, telefono, direccion, observaciones, acompanantes } = data;

    assertRequired(documento, 'El documento de identidad es requerido');
    assertRequired(nombre, 'El nombre completo del cliente es requerido');
    assertRequired(email, 'El correo electrónico es requerido');

    const cleanDoc = String(documento).trim();
    const cleanNombre = String(nombre).trim();
    const cleanEmail = String(email).trim().toLowerCase();

    // Validar unicidad de documento
    const existDoc = await ClienteRepository.getByDocumento(cleanDoc);
    if (existDoc) {
      throw new ConflictError(`Ya existe un cliente registrado con el documento ${cleanDoc}`);
    }

    // Validar que no haya duplicados en los acompañantes
    if (Array.isArray(acompanantes) && acompanantes.length > 0) {
      this.validarAcompanantes(cleanDoc, cleanNombre, acompanantes);
    }

    const nuevoCliente = await ClienteRepository.create({
      documento: cleanDoc,
      nombre: cleanNombre,
      email: cleanEmail,
      telefono: telefono ? String(telefono).trim() : null,
      direccion: direccion ? String(direccion).trim() : null,
      observaciones: observaciones ? String(observaciones).trim() : null,
    });

    // Guardar acompañantes si se enviaron
    if (Array.isArray(acompanantes) && acompanantes.length > 0) {
      for (const a of acompanantes) {
        if (a && a.nombre && String(a.nombre).trim().length > 0) {
          await ClienteRepository.addAcompanante(nuevoCliente.id, {
            nombre: String(a.nombre).trim(),
            documento: a.documento ? String(a.documento).trim() : null,
            parentesco: a.parentesco ? String(a.parentesco).trim() : 'Familiar',
            telefono: a.telefono ? String(a.telefono).trim() : null,
          });
        }
      }
    }

    return await ClienteRepository.getById(nuevoCliente.id);
  }

  /**
   * Busca por documento o email; si existe lo actualiza/retorna, si no lo crea.
   */
  static async findOrCreate(data) {
    const { documento, nombre, email, telefono, acompanantes } = data;
    assertRequired(documento || email, 'Documento o email es requerido para resolver el cliente');

    let cliente = null;
    if (documento) {
      cliente = await ClienteRepository.getByDocumento(documento);
    }
    if (!cliente && email) {
      cliente = await ClienteRepository.getByEmail(email);
    }

    if (cliente) {
      // Actualizar datos de contacto si cambiaron
      const updates = {};
      if (nombre && cliente.nombre !== nombre.trim()) updates.nombre = nombre.trim();
      if (telefono && cliente.telefono !== telefono.trim()) updates.telefono = telefono.trim();
      if (email && cliente.email !== email.trim().toLowerCase()) updates.email = email.trim().toLowerCase();
      if (documento && cliente.documento !== documento.trim()) updates.documento = documento.trim();

      if (Object.keys(updates).length > 0) {
        await ClienteRepository.update(cliente.id, updates);
      }
    } else {
      cliente = await this.create({
        documento: documento || `DOC-${Date.now().toString().slice(-8)}`,
        nombre: nombre || 'Huésped Sin Nombre',
        email: email || `cliente.${Date.now()}@hotel.local`,
        telefono,
        acompanantes,
      });
    }

    // Agregar nuevos acompañantes si no estaban ya registrados y no duplican
    if (Array.isArray(acompanantes) && acompanantes.length > 0) {
      const existAcomps = await ClienteRepository.getAcompanantesByClienteId(cliente.id);
      const existNames = new Set(existAcomps.map(ea => ea.nombre.toLowerCase().trim()));
      const existDocs = new Set(existAcomps.filter(ea => ea.documento).map(ea => ea.documento.toLowerCase().trim()));
      const titularDoc = cliente.documento ? cliente.documento.toLowerCase().trim() : '';
      const titularNombre = cliente.nombre ? cliente.nombre.toLowerCase().trim() : '';

      for (const a of acompanantes) {
        if (!a || !a.nombre || String(a.nombre).trim().length === 0) continue;
        const aName = String(a.nombre).trim();
        const aDoc = a.documento ? String(a.documento).trim() : null;
        const nameKey = aName.toLowerCase();
        const docKey = aDoc ? aDoc.toLowerCase() : null;

        // Evitar duplicar con el cliente titular
        if (docKey && docKey === titularDoc) continue;
        if (nameKey === titularNombre) continue;

        // Evitar duplicar con acompañantes existentes
        if (existNames.has(nameKey)) continue;
        if (docKey && existDocs.has(docKey)) continue;

        existNames.add(nameKey);
        if (docKey) existDocs.add(docKey);

        await ClienteRepository.addAcompanante(cliente.id, {
          nombre: aName,
          documento: aDoc,
          parentesco: a.parentesco ? String(a.parentesco).trim() : 'Familiar',
          telefono: a.telefono ? String(a.telefono).trim() : null,
        });
      }
    }

    return await ClienteRepository.getById(cliente.id);
  }

  /**
   * Actualiza los datos de un cliente existente y sincroniza sus acompañantes.
   */
  static async update(id, data) {
    assertRequired(id, 'El ID del cliente es requerido');
    const cliente = await ClienteRepository.getById(id, { includeAcompanantes: true, includeReservations: false });
    if (!cliente) {
      throw new NotFoundError('Cliente no encontrado');
    }

    const { documento, nombre, email, telefono, direccion, observaciones, acompanantes } = data;
    const updatePayload = {};

    let targetDoc = cliente.documento;
    if (documento) {
      const cleanDoc = String(documento).trim();
      if (cleanDoc !== cliente.documento) {
        const exist = await ClienteRepository.getByDocumento(cleanDoc);
        if (exist && exist.id !== id) {
          throw new ConflictError(`Ya existe otro cliente con el documento ${cleanDoc}`);
        }
        updatePayload.documento = cleanDoc;
        targetDoc = cleanDoc;
      }
    }

    let targetNombre = cliente.nombre;
    if (nombre) {
      targetNombre = String(nombre).trim();
      updatePayload.nombre = targetNombre;
    }

    if (email) updatePayload.email = String(email).trim().toLowerCase();
    if (telefono !== undefined) updatePayload.telefono = telefono ? String(telefono).trim() : null;
    if (direccion !== undefined) updatePayload.direccion = direccion ? String(direccion).trim() : null;
    if (observaciones !== undefined) updatePayload.observaciones = observaciones ? String(observaciones).trim() : null;

    if (Object.keys(updatePayload).length > 0) {
      await ClienteRepository.update(id, updatePayload);
    }

    // Sincronizar acompañantes si se suministraron
    if (Array.isArray(acompanantes)) {
      this.validarAcompanantes(targetDoc, targetNombre, acompanantes);

      const existingAcomps = await ClienteRepository.getAcompanantesByClienteId(id);
      for (const ex of existingAcomps) {
        await ClienteRepository.deleteAcompanante(ex.id);
      }

      for (const a of acompanantes) {
        if (a && a.nombre && String(a.nombre).trim().length > 0) {
          await ClienteRepository.addAcompanante(id, {
            nombre: String(a.nombre).trim(),
            documento: a.documento ? String(a.documento).trim() : null,
            parentesco: a.parentesco ? String(a.parentesco).trim() : 'Familiar',
            telefono: a.telefono ? String(a.telefono).trim() : null,
          });
        }
      }
    }

    return await ClienteRepository.getById(id);
  }

  /**
   * Elimina un cliente.
   */
  static async delete(id) {
    assertRequired(id, 'El ID del cliente es requerido');
    const cliente = await ClienteRepository.getById(id);
    if (!cliente) {
      throw new NotFoundError('Cliente no encontrado');
    }
    if (cliente.reservaciones && cliente.reservaciones.length > 0) {
      throw new BadRequestError('No se puede eliminar un cliente con reservaciones asociadas');
    }
    return await ClienteRepository.delete(id);
  }

  /**
   * Agrega un acompañante a un cliente.
   */
  static async addAcompanante(clienteId, data) {
    assertRequired(clienteId, 'El ID del cliente es requerido');
    assertRequired(data.nombre, 'El nombre del acompañante es requerido');

    const cliente = await ClienteRepository.getById(clienteId, { includeAcompanantes: true, includeReservations: false });
    if (!cliente) {
      throw new NotFoundError('Cliente no encontrado');
    }

    const cleanNombre = String(data.nombre).trim();
    const cleanDoc = data.documento ? String(data.documento).trim() : null;

    // 1. Validar contra el cliente titular
    if (cleanDoc && cliente.documento && cleanDoc.toLowerCase() === cliente.documento.toLowerCase()) {
      throw new ConflictError('El documento del acompañante no puede ser igual al del cliente titular');
    }
    if (cliente.nombre && cleanNombre.toLowerCase() === cliente.nombre.toLowerCase()) {
      throw new ConflictError('El acompañante no puede ser el mismo cliente titular');
    }

    // 2. Validar contra los acompañantes ya registrados para este cliente
    if (cliente.acompanantes && cliente.acompanantes.length > 0) {
      for (const exist of cliente.acompanantes) {
        if (cleanDoc && exist.documento && exist.documento.trim().toLowerCase() === cleanDoc.toLowerCase()) {
          throw new ConflictError(`Ya existe un acompañante registrado con el documento ${cleanDoc} para este cliente`);
        }
        if (exist.nombre && exist.nombre.trim().toLowerCase() === cleanNombre.toLowerCase()) {
          throw new ConflictError(`Ya existe un acompañante registrado con el nombre "${cleanNombre}" para este cliente`);
        }
      }
    }

    return await ClienteRepository.addAcompanante(clienteId, {
      nombre: cleanNombre,
      documento: cleanDoc,
      parentesco: data.parentesco ? String(data.parentesco).trim() : 'Familiar',
      telefono: data.telefono ? String(data.telefono).trim() : null,
      reserva_id: data.reserva_id || null,
    });
  }

  /**
   * Elimina un acompañante.
   */
  static async deleteAcompanante(acompananteId) {
    assertRequired(acompananteId, 'El ID del acompañante es requerido');
    const a = await ClienteRepository.deleteAcompanante(acompananteId);
    if (!a) {
      throw new NotFoundError('Acompañante no encontrado');
    }
    return a;
  }
}

export default ClienteService;
