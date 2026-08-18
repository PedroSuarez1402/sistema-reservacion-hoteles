# 🏨 Sistema de Reservación de Hoteles

Sistema moderno de gestión hotelera construido con **Next.js 14** (frontend) y **Node.js 22 + Express** (backend). Permite a los huéspedes buscar, reservar y gestionar sus estadías, y a los administradores controlar habitaciones, reservas y check-in/out.

---

## 📋 Tabla de Contenido

- [Características](#-características)
- [Tecnologías](#-tecnologías)
- [Requisitos Previos](#-requisitos-previos)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Ejecución](#-ejecución)
- [Dependencias Instaladas](#-dependencias-instaladas)
- [Requerimientos Funcionales](#-requerimientos-funcionales)
- [Requerimientos No Funcionales](#-requerimientos-no-funcionales)
- [Scripts Disponibles](#-scripts-disponibles)
- [Contribuir](#-contribuir)
- [Licencia](#-licencia)

---

## ✨ Características

### Módulo de Gestión de Habitaciones
- Crear, editar y eliminar habitaciones
- Asignar tipos: Sencilla, Doble, Suite
- Control de estados: Disponible, Ocupada, Mantenimiento
- Precio por noche y capacidades

### Motor de Reservas
- Búsqueda avanzada de disponibilidad por rango de fechas
- Creación, modificación y cancelación de reservas
- Prevención de doble reserva (control de concurrencia)
- Historial de reservas por usuario

### Gestión de Usuarios
- Registro e inicio de sesión con JWT
- Roles: **Huésped** y **Administrador / Recepcionista**
- Huésped: visualiza y gestiona solo sus propias reservas
- Admin: acceso completo al sistema

### Check-in / Check-out
- Cambio de estado de la reserva (Confirmada → Check-in → Check-out / Cancelada)
- Actualización automática del estado de la habitación
- Registro de fechas y usuario responsable

### Facturación Básica
- Cálculo automático de costo total (precio noche × días)
- Registro de servicios extra consumidos
- Generación de factura al finalizar la estadía
