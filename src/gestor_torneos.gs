/**
 * GESTOR DE TORNEOS TIPAZOS - VERSIÓN APP WEB
 * Sistema M&L: 3pts Victoria | 1pt Empate
 * VERSIÓN CON LOGIN DE USUARIOS PREDEFINIDOS
 */

// ==================== USUARIOS AUTORIZADOS ====================
const USUARIOS = {
  "Sirob": "Sirob350",
  "Cuantic": "Cuantic350",
  "Flyn": "Flyn350",
  "Vlim": "Vlim350",
  "Jose": "Jose350"
};

const CONFIG = {
  HOJA_JUGADORES: "Jugadores",
  HOJA_PARTIDAS: "Partidas",
  HOJA_CLASIFICACION: "Clasificacion",
  PUNTOS_VICTORIA: 3,
  PUNTOS_EMPATE: 1,
  PUNTOS_DERROTA: 0,
  RONDAS_RECOMENDADAS: 0,
  IMAGEN_URL: "https://i.postimg.cc/N5GHHFx3/Tipazos-sin-fondo.png",
  SPREADSHEET_ID: null
};

// ==================== FUNCIÓN DE VERIFICACIÓN ====================

function verificarUsuario(usuario, clave) {
  if (USUARIOS[usuario] && USUARIOS[usuario] === clave) {
    return { exito: true, mensaje: "✅ Acceso concedido" };
  }
  return { exito: false, mensaje: "❌ Usuario o contraseña incorrectos" };
}

// ==================== UTILIDADES ====================

function obtenerSpreadsheet() {
  if (CONFIG.SPREADSHEET_ID) {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function sanitizar(texto) {
  if (!texto) return '';
  return texto.replace(/[^a-zA-ZáéíóúñÑüÜ\s\-']/g, '').trim();
}

function logError(funcion, error) {
  console.error('❌ Error en ' + funcion + ':', error.message);
  console.error('Stack:', error.stack);
}

// ==================== APLICACIÓN WEB ====================

function doGet() {
  var html = HtmlService.createHtmlOutputFromFile('AppIndex')
    .setTitle('Tipazos TCG - Gestor de Torneos')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  
  return html;
}

function obtenerURLApp() {
  return ScriptApp.getService().getUrl();
}

// ==================== FUNCIONES PARA LA APP ====================

function obtenerEstadisticasApp() {
  try {
    var ss = obtenerSpreadsheet();
    var jugadoresSheet = ss.getSheetByName(CONFIG.HOJA_JUGADORES);
    var partidasSheet = ss.getSheetByName(CONFIG.HOJA_PARTIDAS);
    
    var jugadores = jugadoresSheet ? Math.max(0, jugadoresSheet.getLastRow() - 1) : 0;
    var partidas = partidasSheet ? Math.max(0, partidasSheet.getLastRow() - 1) : 0;
    
    var ronda = 0;
    if (partidasSheet && partidasSheet.getLastRow() > 1) {
      var data = partidasSheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] > ronda) ronda = data[i][0];
      }
    }
    
    return { jugadores: jugadores, partidas: partidas, ronda: ronda };
  } catch (error) {
    logError('obtenerEstadisticasApp', error);
    return { jugadores: 0, partidas: 0, ronda: 0 };
  }
}

function obtenerJugadoresExistentes() {
  try {
    var ss = obtenerSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.HOJA_JUGADORES);
    if (!sheet) return [];
    
    var data = sheet.getDataRange().getValues();
    var jugadores = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][1]) {
        var oponentes = data[i][7] ? data[i][7].split(',').filter(function(x) { return x; }) : [];
        jugadores.push({
          id: data[i][0],
          nombre: data[i][1],
          deck: data[i][2] || '',
          pts: data[i][3] || 0,
          partidas: data[i][4] || 0,
          gamesGanados: data[i][5] || 0,
          gamesJugados: data[i][6] || 0,
          oponentes: oponentes,
          tuvoBye: data[i][8] || false
        });
      }
    }
    return jugadores;
  } catch (error) {
    logError('obtenerJugadoresExistentes', error);
    return [];
  }
}

function guardarJugadoresDesdeHTML(jugadores) {
  try {
    if (!jugadores || jugadores.length === 0) {
      return '⚠️ No hay jugadores para guardar';
    }
    
    var ss = obtenerSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.HOJA_JUGADORES);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.HOJA_JUGADORES);
    }
    
    sheet.clear();
    sheet.appendRow(['ID', 'Nombre', 'Deck', 'PTS', 'Partidas', 'Games G', 'Games J', 'Oponentes', 'Bye']);
    
    for (var i = 0; i < jugadores.length; i++) {
      var j = jugadores[i];
      var id = 'J' + String(i + 1).padStart(3, '0');
      var nombre = sanitizar(j.nombre);
      var deck = sanitizar(j.deck || '');
      sheet.appendRow([id, nombre, deck, 0, 0, 0, 0, '', false]);
    }
    
    inicializarClasificacion();
    aplicarFormatoVisual();
    aplicarMejorasVisuales();
    
    return '✅ ' + jugadores.length + ' jugadores guardados correctamente';
  } catch (error) {
    logError('guardarJugadoresDesdeHTML', error);
    return '❌ Error: ' + error.message;
  }
}

// ==================== FUNCIONES DE RONDAS RECOMENDADAS ====================

function calcularRondasRecomendadas(totalJugadores) {
  if (totalJugadores <= 0) return 0;
  if (totalJugadores <= 8) return 3;
  if (totalJugadores <= 16) return 4;
  if (totalJugadores <= 32) return 5;
  if (totalJugadores <= 64) return 6;
  if (totalJugadores <= 128) return 7;
  return 8;
}

function obtenerTablaRondas(totalJugadores) {
  var tabla = '📊 RONDAS SUIZAS RECOMENDADAS\n';
  tabla += '═'.repeat(40) + '\n';
  tabla += 'Jugadores      | Rondas\n';
  tabla += '─'.repeat(40) + '\n';
  tabla += '4 - 8          | 3\n';
  tabla += '9 - 16         | 4\n';
  tabla += '17 - 32        | 5\n';
  tabla += '33 - 64        | 6\n';
  tabla += '65 - 128       | 7\n';
  tabla += '129+           | 8\n';
  tabla += '═'.repeat(40) + '\n';
  
  var recomendadas = calcularRondasRecomendadas(totalJugadores);
  tabla += '🎯 Para ' + totalJugadores + ' jugadores: ' + recomendadas + ' rondas recomendadas';
  
  return tabla;
}

// ==================== GENERAR EMPAREJAMIENTOS ====================

function generarEmparejamientos() {
  try {
    var ss = obtenerSpreadsheet();
    var jugadoresSheet = ss.getSheetByName(CONFIG.HOJA_JUGADORES);
    
    if (!jugadoresSheet) {
      return '❌ Primero registra jugadores';
    }
    
    var data = jugadoresSheet.getDataRange().getValues();
    if (data.length < 2) {
      return '❌ Necesitas al menos 2 jugadores';
    }
    
    var totalJugadores = 0;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][1]) totalJugadores++;
    }
    
    var tablaRondas = obtenerTablaRondas(totalJugadores);
    var rondasRecomendadas = calcularRondasRecomendadas(totalJugadores);
    
    var jugadores = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][1]) {
        var oponentes = data[i][7] ? data[i][7].split(',').filter(function(x) { return x; }) : [];
        jugadores.push({
          id: data[i][0],
          nombre: data[i][1],
          deck: data[i][2] || '',
          pts: data[i][3] || 0,
          partidas: data[i][4] || 0,
          gamesGanados: data[i][5] || 0,
          gamesJugados: data[i][6] || 0,
          oponentes: oponentes,
          tuvoBye: data[i][8] || false
        });
      }
    }
    
    if (jugadores.length < 2) {
      return '❌ No hay suficientes jugadores';
    }
    
    CONFIG.RONDAS_RECOMENDADAS = rondasRecomendadas;
    
    var partidasSheet = ss.getSheetByName(CONFIG.HOJA_PARTIDAS);
    var rondaActual = 1;
    if (partidasSheet && partidasSheet.getLastRow() > 1) {
      var rondas = partidasSheet.getRange(2, 1, partidasSheet.getLastRow() - 1, 1).getValues();
      var maxRonda = 0;
      for (var r = 0; r < rondas.length; r++) {
        if (rondas[r][0] > maxRonda) maxRonda = rondas[r][0];
      }
      rondaActual = maxRonda + 1;
    }
    
    if (rondaActual > rondasRecomendadas && rondasRecomendadas > 0) {
      return '⚠️ Ya se superaron las rondas recomendadas (' + rondasRecomendadas + ').\nRonda actual: ' + rondaActual;
    }
    
    var emparejamientos = generarEmparejamientosSuizos(jugadores);
    
    if (!partidasSheet) {
      partidasSheet = ss.insertSheet(CONFIG.HOJA_PARTIDAS);
      partidasSheet.appendRow(['Ronda', 'Mesa', 'Jugador1', 'Jugador2', 'Games J1', 'Games J2', 'Ganador', 'Resultado']);
    }
    
    if (partidasSheet.getLastRow() > 1) {
      var ultimaRonda = partidasSheet.getRange(partidasSheet.getLastRow(), 1).getValue();
      if (ultimaRonda === rondaActual) {
        var filasAEliminar = 0;
        for (var i = partidasSheet.getLastRow(); i >= 2; i--) {
          if (partidasSheet.getRange(i, 1).getValue() === rondaActual) {
            filasAEliminar++;
          } else {
            break;
          }
        }
        if (filasAEliminar > 0) {
          partidasSheet.deleteRows(partidasSheet.getLastRow() - filasAEliminar + 1, filasAEliminar);
        }
      }
    }
    
    for (var e = 0; e < emparejamientos.length; e++) {
      var par = emparejamientos[e];
      var j2Nombre = par.j2 ? par.j2.nombre : 'BYE';
      partidasSheet.appendRow([
        rondaActual,
        e + 1,
        par.j1.nombre,
        j2Nombre,
        0, 0, '', ''
      ]);
      
      if (!par.j2) {
        marcarByeEnJugador(par.j1.id);
      }
    }
    
    var mensaje = tablaRondas + '\n\n';
    var tipoEmparejamiento = (rondaActual === 1) ? '🎲 ALEATORIO' : '📊 SUIZO (por puntos)';
    mensaje += '🔀 Ronda ' + rondaActual + ' generada (' + tipoEmparejamiento + '):\n\n';
    
    var jugadoresConBye = 0;
    for (var m = 0; m < emparejamientos.length; m++) {
      var par = emparejamientos[m];
      if (par.j2) {
        mensaje += 'Mesa ' + (m+1) + ': ' + par.j1.nombre + ' vs ' + par.j2.nombre + '\n';
      } else {
        mensaje += 'Mesa ' + (m+1) + ': ' + par.j1.nombre + ' (BYE - descansa)\n';
        jugadoresConBye++;
      }
    }
    
    mensaje += '\n📌 Rondas restantes: ' + Math.max(0, rondasRecomendadas - rondaActual + 1);
    if (jugadoresConBye > 0) {
      mensaje += '\n🎯 ' + jugadoresConBye + ' jugador(es) con BYE (menor puntaje)';
    }
    
    aplicarFormatoVisual();
    aplicarMejorasVisuales();
    
    return mensaje;
    
  } catch (error) {
    logError('generarEmparejamientos', error);
    return '❌ Error: ' + error.message;
  }
}

function generarEmparejamientosSuizos(jugadores) {
  var esPrimeraRonda = true;
  for (var i = 0; i < jugadores.length; i++) {
    if (jugadores[i].partidas > 0) {
      esPrimeraRonda = false;
      break;
    }
  }
  
  if (esPrimeraRonda) {
    var mezclados = jugadores.slice();
    for (var i = mezclados.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = mezclados[i];
      mezclados[i] = mezclados[j];
      mezclados[j] = temp;
    }
    
    var emparejamientos = [];
    for (var i = 0; i < mezclados.length; i += 2) {
      if (i + 1 < mezclados.length) {
        emparejamientos.push({ j1: mezclados[i], j2: mezclados[i + 1] });
      } else {
        emparejamientos.push({ j1: mezclados[i], j2: null });
      }
    }
    return emparejamientos;
  }
  
  jugadores.sort(function(a, b) {
    return b.pts - a.pts;
  });
  
  var tieneBye = (jugadores.length % 2 !== 0);
  var emparejamientos = [];
  var usados = {};
  
  if (tieneBye) {
    var indiceBye = -1;
    var jugadorBye = null;
    
    for (var i = jugadores.length - 1; i >= 0; i--) {
      if (!jugadores[i].tuvoBye) {
        indiceBye = i;
        jugadorBye = jugadores[i];
        break;
      }
    }
    
    if (indiceBye === -1) {
      indiceBye = jugadores.length - 1;
      jugadorBye = jugadores[indiceBye];
      for (var i = 0; i < jugadores.length; i++) {
        jugadores[i].tuvoBye = false;
      }
    }
    
    emparejamientos.push({ j1: jugadorBye, j2: null });
    usados[indiceBye] = true;
    jugadorBye.tuvoBye = true;
  }
  
  for (var i = 0; i < jugadores.length; i++) {
    if (usados[i]) continue;
    
    var emparejado = false;
    for (var j = i + 1; j < jugadores.length; j++) {
      if (usados[j]) continue;
      
      var yaJugaron = false;
      for (var k = 0; k < jugadores[i].oponentes.length; k++) {
        if (jugadores[i].oponentes[k] === jugadores[j].id) {
          yaJugaron = true;
          break;
        }
      }
      if (!yaJugaron) {
        for (var k = 0; k < jugadores[j].oponentes.length; k++) {
          if (jugadores[j].oponentes[k] === jugadores[i].id) {
            yaJugaron = true;
            break;
          }
        }
      }
      
      if (!yaJugaron) {
        emparejamientos.push({ j1: jugadores[i], j2: jugadores[j] });
        usados[i] = true;
        usados[j] = true;
        emparejado = true;
        break;
      }
    }
    
    if (!emparejado) {
      emparejamientos.push({ j1: jugadores[i], j2: null });
      usados[i] = true;
    }
  }
  
  return emparejamientos;
}

function marcarByeEnJugador(idJugador) {
  try {
    var ss = obtenerSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.HOJA_JUGADORES);
    if (!sheet) return;
    
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === idJugador) {
        sheet.getRange(i + 1, 9).setValue(true);
        break;
      }
    }
  } catch (error) {
    logError('marcarByeEnJugador', error);
  }
}

// ==================== REGISTRO DE RESULTADOS ====================

function obtenerPartidasPendientes() {
  try {
    var ss = obtenerSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.HOJA_PARTIDAS);
    
    if (!sheet) return [];
    
    var data = sheet.getDataRange().getValues();
    var pendientes = [];
    for (var i = 1; i < data.length; i++) {
      if (!data[i] || data[i].length < 7) continue;
      var ganador = data[i][6] || '';
      if (ganador === '') {
        pendientes.push({
          ronda: data[i][0] || '',
          mesa: data[i][1] || '',
          j1: data[i][2] || '',
          j2: data[i][3] || 'BYE',
          fila: i + 1
        });
      }
    }
    return pendientes;
  } catch (error) {
    logError('obtenerPartidasPendientes', error);
    return [];
  }
}

function guardarResultadosPartidas(resultados) {
  try {
    var ss = obtenerSpreadsheet();
    var partidasSheet = ss.getSheetByName(CONFIG.HOJA_PARTIDAS);
    var jugadoresSheet = ss.getSheetByName(CONFIG.HOJA_JUGADORES);
    
    if (!partidasSheet || !jugadoresSheet) {
      return '❌ Error: No se encuentran las hojas necesarias';
    }
    
    var data = partidasSheet.getDataRange().getValues();
    var puntosActualizados = 0;
    
    for (var r = 0; r < resultados.length; r++) {
      var res = resultados[r];
      var fila = res.fila;
      
      if (fila > data.length) continue;
      
      var j1 = data[fila - 1][2];
      var j2 = data[fila - 1][3];
      
      partidasSheet.getRange(fila, 5).setValue(res.games1);
      partidasSheet.getRange(fila, 6).setValue(res.games2);
      partidasSheet.getRange(fila, 7).setValue(res.ganador);
      partidasSheet.getRange(fila, 8).setValue(res.games1 + '-' + res.games2);
      
      var ptsJ1 = CONFIG.PUNTOS_DERROTA;
      var ptsJ2 = CONFIG.PUNTOS_DERROTA;
      
      if (res.ganador === 'empate') {
        ptsJ1 = CONFIG.PUNTOS_EMPATE;
        ptsJ2 = CONFIG.PUNTOS_EMPATE;
      } else if (res.ganador === j1) {
        ptsJ1 = CONFIG.PUNTOS_VICTORIA;
      } else if (res.ganador === j2) {
        ptsJ2 = CONFIG.PUNTOS_VICTORIA;
      }
      
      actualizarEstadisticasJugador(j1, ptsJ1, res.games1, res.games1 + res.games2, j2);
      if (j2 && j2 !== 'BYE') {
        actualizarEstadisticasJugador(j2, ptsJ2, res.games2, res.games1 + res.games2, j1);
      }
      puntosActualizados++;
    }
    
    actualizarClasificacionCompleta();
    aplicarFormatoVisual();
    aplicarMejorasVisuales();
    
    return '✅ ' + puntosActualizados + ' resultados guardados correctamente';
  } catch (error) {
    logError('guardarResultadosPartidas', error);
    return '❌ Error al guardar: ' + error.message;
  }
}

function actualizarEstadisticasJugador(nombre, pts, gamesGanados, gamesJugados, oponente) {
  if (!nombre || nombre === 'BYE' || nombre === '') return;
  
  try {
    var ss = obtenerSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.HOJA_JUGADORES);
    if (!sheet) return;
    
    var data = sheet.getDataRange().getValues();
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][1] === nombre) {
        var ptsActuales = data[i][3] || 0;
        var partidasActuales = data[i][4] || 0;
        var gamesGanadosActuales = data[i][5] || 0;
        var gamesJugadosActuales = data[i][6] || 0;
        var oponentesActuales = data[i][7] || '';
        
        sheet.getRange(i + 1, 4).setValue(ptsActuales + pts);
        sheet.getRange(i + 1, 5).setValue(partidasActuales + 1);
        sheet.getRange(i + 1, 6).setValue(gamesGanadosActuales + gamesGanados);
        sheet.getRange(i + 1, 7).setValue(gamesJugadosActuales + gamesJugados);
        
        if (oponente && oponente !== 'BYE' && oponente !== '') {
          var nuevosOponentes = oponentesActuales ? oponentesActuales + ',' + oponente : oponente;
          sheet.getRange(i + 1, 8).setValue(nuevosOponentes);
        }
        break;
      }
    }
  } catch (error) {
    logError('actualizarEstadisticasJugador', error);
  }
}

// ==================== CLASIFICACIÓN ====================

function inicializarClasificacion() {
  var ss = obtenerSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.HOJA_CLASIFICACION);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.HOJA_CLASIFICACION);
  }
  sheet.clear();
  sheet.appendRow(['Pos', 'Jugador', 'Deck', 'PTS', 'OMW', 'PGW', 'OGW', 'Partidas', 'Games G', 'Games J']);
}

function actualizarClasificacionCompleta() {
  try {
    var ss = obtenerSpreadsheet();
    var jugadoresSheet = ss.getSheetByName(CONFIG.HOJA_JUGADORES);
    var partidasSheet = ss.getSheetByName(CONFIG.HOJA_PARTIDAS);
    var clasificacionSheet = ss.getSheetByName(CONFIG.HOJA_CLASIFICACION);
    
    if (!jugadoresSheet || !clasificacionSheet) return;
    
    var data = jugadoresSheet.getDataRange().getValues();
    var jugadores = [];
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0]
