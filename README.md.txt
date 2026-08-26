# 🏆 Tipazos TCG - Gestor de Torneos

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-v8-blue)](https://developers.google.com/apps-script)

> Gestor de torneos para TCG con sistema suizo, desarrollado para la comunidad Tipazos Chile.

## 📋 Características

- ✅ Sistema de emparejamientos suizos
- ✅ BYE asignado al jugador con menor puntaje (rotativo)
- ✅ Registro de resultados con sistema 3-1-0
- ✅ Clasificación con OMW, PGW y OGW
- ✅ Interfaz PWA para dispositivos móviles
- ✅ Dashboard en tiempo real
- ✅ Estadísticas de mazos
- ✅ Cierre de torneo con premiaciones

## 🚀 Tecnologías

- Google Apps Script (Backend)
- HTML5 / CSS3 / JavaScript (Frontend)
- Progressive Web App (PWA)
- Google Sheets (Base de datos)

## 📦 Instalación

### 1. Crear el proyecto en Google Apps Script

1. Ve a [script.google.com](https://script.google.com)
2. Crea un nuevo proyecto
3. Nombra el proyecto: "Tipazos TCG"

### 2. Subir los archivos

1. Copia el contenido de `src/gestor_torneos.gs` en el editor de código
2. Ve a Archivo > Nuevo > HTML y pega el contenido de `src/AppIndex.html`
3. Guarda el proyecto (Ctrl+S)

### 3. Configurar la hoja de cálculo

1. Haz clic en **"Ejecutar"** para autorizar los permisos
2. La hoja de cálculo se creará automáticamente

### 4. Desplegar como aplicación web

1. Haz clic en **"Desplegar"** > **"Nuevo despliegue"**
2. Selecciona **"Aplicación web"**
3. Configura: Ejecutar como: **Yo** | Acceso: **Cualquier persona**
4. Haz clic en **"Desplegar"**
5. Copia la URL generada

## 🎯 Sistema de Puntuación

| Resultado | Puntos |
|-----------|--------|
| Victoria  | 3      |
| Empate    | 1      |
| Derrota   | 0      |

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea tu rama (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📄 Licencia

MIT License - ver el archivo [LICENSE](LICENSE)

## 👥 Equipo

- **Desarrollo:** Team Tipazos
- **Comunidad:** Tipazos TCG Chile

⭐ **¡Si te gusta este proyecto, dale una estrella en GitHub!**