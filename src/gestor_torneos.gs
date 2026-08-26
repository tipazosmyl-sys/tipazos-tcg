/**
 * GESTOR DE TORNEOS TIPAZOS - VERSIÓN APP WEB
 * Sistema M&L: 3pts Victoria | 1pt Empate
 * VERSIÓN MEJORADA - BYE CORRECTO + SEGURIDAD + RENDIMIENTO
 */

const CONFIG = {
  HOJA_JUGADORES: "Jugadores",
  HOJA_PARTIDAS: "Partidas",
  HOJA_CLASIFICACION: "Clasificacion",
  PUNTOS_VICTORIA: 3,
  PUNTOS_EMPATE: 1,
  PUNTOS_DERROTA: 0,
  RONDAS_RECOMENDADAS: 0,
  IMAGEN_URL: "https://i.postimg.cc/N5GHHFx3/Tipazos-sin-fondo.png",
  SPREADSHEET_ID: null // Opcional: pon el ID si quieres fijar el spreadsheet
};

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
  // Opcional: enviar a un sheet de logs
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
    // Añadida columna 'Bye' (índice 8)
    sheet.appendRow(['ID', 'Nombre', 'Deck', 'PTS', 'Partidas', 'Games G', 'Games J', 'Oponentes', 'Bye']);
    
    for (var i = 0; i < jugadores.length; i++) {
      var j = jugadores[i];
      var id = 'J' + String(i + 1).padStart(3, '0');
      // Sanitizar entrada
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

// ==================== GENERAR EMPAREJAMIENTOS (CORREGIDO) ====================

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
    
    // Guardar emparejamientos
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
      
      // Si es BYE, marcar el jugador como que tuvo bye
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

// ==================== EMPAREJAMIENTOS SUIZOS (CORREGIDO) ====================

function generarEmparejamientosSuizos(jugadores) {
  // Verificar si es primera ronda
  var esPrimeraRonda = true;
  for (var i = 0; i < jugadores.length; i++) {
    if (jugadores[i].partidas > 0) {
      esPrimeraRonda = false;
      break;
    }
  }
  
  // PRIMERA RONDA: Aleatorio
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
        // BYE aleatorio en primera ronda
        emparejamientos.push({ j1: mezclados[i], j2: null });
      }
    }
    return emparejamientos;
  }
  
  // ========== RONDAS SIGUIENTES ==========
  // Ordenar por puntos (mayor a menor)
  jugadores.sort(function(a, b) {
    return b.pts - a.pts;
  });
  
  var tieneBye = (jugadores.length % 2 !== 0);
  var emparejamientos = [];
  var usados = {};
  
  // ✅ CORREGIDO: Seleccionar al jugador con MENOS PUNTOS para BYE
  if (tieneBye) {
    // Buscar al jugador con menos puntos que NO haya tenido BYE antes
    var indiceBye = -1;
    var jugadorBye = null;
    
    // Primero intentar con los que NO han tenido BYE
    for (var i = jugadores.length - 1; i >= 0; i--) {
      if (!jugadores[i].tuvoBye) {
        indiceBye = i;
        jugadorBye = jugadores[i];
        break;
      }
    }
    
    // Si todos han tenido BYE, elegir al de menor puntaje
    if (indiceBye === -1) {
      indiceBye = jugadores.length - 1;
      jugadorBye = jugadores[indiceBye];
      // Resetear flag de BYE para todos
      for (var i = 0; i < jugadores.length; i++) {
        jugadores[i].tuvoBye = false;
      }
    }
    
    emparejamientos.push({ j1: jugadorBye, j2: null });
    usados[indiceBye] = true;
    jugadorBye.tuvoBye = true; // Marcar que tuvo BYE
    
    console.log('🎯 BYE asignado a: ' + jugadorBye.nombre + ' (PTS: ' + jugadorBye.pts + ')');
  }
  
  // Emparejar al resto
  for (var i = 0; i < jugadores.length; i++) {
    if (usados[i]) continue;
    
    var emparejado = false;
    for (var j = i + 1; j < jugadores.length; j++) {
      if (usados[j]) continue;
      
      // Verificar si ya jugaron antes
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
    
    // Si no encontró pareja (fallback)
    if (!emparejado) {
      emparejamientos.push({ j1: jugadores[i], j2: null });
      usados[i] = true;
      console.warn('⚠️ BYE forzado para: ' + jugadores[i].nombre);
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
      if (data[i][0] && data[i][1]) {
        var nombre = data[i][1];
        var stats = calcularOMW_PGW_OGW(nombre, partidasSheet);
        
        jugadores.push({
          id: data[i][0],
          nombre: nombre,
          deck: data[i][2] || '',
          pts: data[i][3] || 0,
          partidas: data[i][4] || 0,
          gamesGanados: data[i][5] || 0,
          gamesJugados: data[i][6] || 0,
          omw: stats.omw,
          pgw: stats.pgw,
          ogw: stats.ogw
        });
      }
    }
    
    jugadores.sort(function(a, b) {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.omw !== a.omw) return b.omw - a.omw;
      if (b.pgw !== a.pgw) return b.pgw - a.pgw;
      return b.ogw - a.ogw;
    });
    
    clasificacionSheet.clear();
    clasificacionSheet.appendRow(['Pos', 'Jugador', 'Deck', 'PTS', 'OMW', 'PGW', 'OGW', 'Partidas', 'Games G', 'Games J']);
    
    for (var j = 0; j < jugadores.length; j++) {
      var jug = jugadores[j];
      clasificacionSheet.appendRow([
        j + 1,
        jug.nombre,
        jug.deck,
        jug.pts,
        jug.omw + '%',
        jug.pgw + '%',
        jug.ogw + '%',
        jug.partidas,
        jug.gamesGanados,
        jug.gamesJugados
      ]);
    }
  } catch (error) {
    logError('actualizarClasificacionCompleta', error);
  }
}

function calcularOMW_PGW_OGW(nombre, partidasSheet) {
  if (!partidasSheet) return { omw: 0, pgw: 0, ogw: 0 };
  
  var data = partidasSheet.getDataRange().getValues();
  var oponentes = [];
  var gamesGanados = 0;
  var gamesJugados = 0;
  
  for (var i = 1; i < data.length; i++) {
    var j1 = data[i][2];
    var j2 = data[i][3];
    var g1 = data[i][4] || 0;
    var g2 = data[i][5] || 0;
    var ganador = data[i][6] || '';
    
    if (j1 === nombre && j2 && j2 !== 'BYE') {
      oponentes.push(j2);
      gamesGanados += g1;
      gamesJugados += g1 + g2;
    } else if (j2 === nombre && j1 && j1 !== 'BYE') {
      oponentes.push(j1);
      gamesGanados += g2;
      gamesJugados += g1 + g2;
    }
  }
  
  var pgw = gamesJugados > 0 ? Math.round((gamesGanados / gamesJugados) * 100) : 0;
  
  var omwTotal = 0;
  var ogwTotal = 0;
  var oponentesValidos = 0;
  
  for (var o = 0; o < oponentes.length; o++) {
    var stats = calcularEstadisticasOponente(oponentes[o], data);
    if (stats.matchesJugados > 0) {
      omwTotal += (stats.matchesGanados / stats.matchesJugados) * 100;
      ogwTotal += stats.ogw;
      oponentesValidos++;
    }
  }
  
  var omw = oponentesValidos > 0 ? Math.round(omwTotal / oponentesValidos) : 0;
  var ogw = oponentesValidos > 0 ? Math.round(ogwTotal / oponentesValidos) : 0;
  
  return { omw: omw, pgw: pgw, ogw: ogw };
}

function calcularEstadisticasOponente(nombre, data) {
  var matchesGanados = 0;
  var matchesJugados = 0;
  var gamesGanados = 0;
  var gamesJugados = 0;
  
  for (var i = 1; i < data.length; i++) {
    var j1 = data[i][2];
    var j2 = data[i][3];
    var g1 = data[i][4] || 0;
    var g2 = data[i][5] || 0;
    var ganador = data[i][6] || '';
    
    if (j1 === nombre) {
      matchesJugados++;
      gamesJugados += g1 + g2;
      gamesGanados += g1;
      if (ganador === nombre) matchesGanados++;
    } else if (j2 === nombre) {
      matchesJugados++;
      gamesJugados += g1 + g2;
      gamesGanados += g2;
      if (ganador === nombre) matchesGanados++;
    }
  }
  
  var ogw = gamesJugados > 0 ? Math.round((gamesGanados / gamesJugados) * 100) : 0;
  
  return { matchesGanados: matchesGanados, matchesJugados: matchesJugados, ogw: ogw };
}

// ==================== FORMATO VISUAL ====================

function aplicarFormatoVisual() {
  try {
    var ss = obtenerSpreadsheet();
    var clasificacion = ss.getSheetByName(CONFIG.HOJA_CLASIFICACION);
    if (clasificacion) {
      var lastRow = clasificacion.getLastRow();
      var lastCol = clasificacion.getLastColumn();
      if (lastRow > 1) {
        var header = clasificacion.getRange(1, 1, 1, lastCol);
        header.setFontFamily('Arial').setFontSize(12).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#f5a623').setHorizontalAlignment('center').setVerticalAlignment('middle');
        clasificacion.autoResizeColumns(1, lastCol);
      }
    }
  } catch (error) {
    logError('aplicarFormatoVisual', error);
  }
}

function aplicarMejorasVisuales() {
  try {
    var ss = obtenerSpreadsheet();
    var clasificacion = ss.getSheetByName(CONFIG.HOJA_CLASIFICACION);
    if (clasificacion && clasificacion.getLastRow() > 1) {
      aplicarBarrasProgreso();
      agregarMedallas();
    }
  } catch (error) {
    logError('aplicarMejorasVisuales', error);
  }
}

function aplicarBarrasProgreso() {
  try {
    var ss = obtenerSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.HOJA_CLASIFICACION);
    if (!sheet) return;
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return;
    
    var ptsRange = sheet.getRange(2, 4, lastRow - 1, 1);
    var ptsValues = ptsRange.getValues();
    var maxPts = 0;
    for (var i = 0; i < ptsValues.length; i++) {
      if (ptsValues[i][0] > maxPts) maxPts = ptsValues[i][0];
    }
    if (maxPts === 0) return;
    
    for (var i = 0; i < ptsValues.length; i++) {
      var porcentaje = (ptsValues[i][0] / maxPts) * 100;
      var cell = sheet.getRange(i + 2, 4);
      if (porcentaje >= 80) {
        cell.setBackground('#2ecc71').setFontColor('#ffffff');
      } else if (porcentaje >= 50) {
        cell.setBackground('#f5a623').setFontColor('#1a1a2e');
      } else if (porcentaje >= 20) {
        cell.setBackground('#e67e22').setFontColor('#ffffff');
      } else {
        cell.setBackground('#e94560').setFontColor('#ffffff');
      }
    }
  } catch (error) {
    logError('aplicarBarrasProgreso', error);
  }
}

function agregarMedallas() {
  try {
    var ss = obtenerSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.HOJA_CLASIFICACION);
    if (!sheet) return;
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return;
    
    var medallas = ['🥇', '🥈', '🥉'];
    for (var i = 0; i < Math.min(3, lastRow - 1); i++) {
      var cell = sheet.getRange(i + 2, 1);
      var pos = cell.getValue();
      if (pos <= 3) {
        cell.setValue(medallas[i]);
      }
    }
  } catch (error) {
    logError('agregarMedallas', error);
  }
}

// ==================== FUNCIONES PARA PANELES INTEGRADOS ====================

function obtenerDatosClasificacion() {
  try {
    var ss = obtenerSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.HOJA_CLASIFICACION);
    
    if (!sheet) return [];
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];
    
    var resultado = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][1]) {
        resultado.push({
          pos: data[i][0],
          nombre: data[i][1],
          pts: data[i][3] || 0,
          pgw: data[i][5] || '0%',
          omw: data[i][4] || '0%'
        });
      }
    }
    
    return resultado;
    
  } catch (error) {
    logError('obtenerDatosClasificacion', error);
    return [];
  }
}

function obtenerDatosDashboard() {
  try {
    var ss = obtenerSpreadsheet();
    var clasificacion = ss.getSheetByName(CONFIG.HOJA_CLASIFICACION);
    
    if (!clasificacion) return [];
    
    var data = clasificacion.getDataRange().getValues();
    if (data.length < 2) return [];
    
    var totalJugadores = data.length - 1;
    var lider = data[1];
    var puntosMax = lider ? lider[3] || 0 : 0;
    var totalPartidas = 0;
    var totalGames = 0;
    var top3 = [];
    
    for (var i = 1; i < data.length; i++) {
      totalPartidas += data[i][7] || 0;
      totalGames += data[i][8] || 0;
    }
    
    for (var i = 1; i < Math.min(4, data.length); i++) {
      if (data[i][0] && data[i][1]) {
        top3.push({
          nombre: data[i][1],
          pts: data[i][3] || 0
        });
      }
    }
    
    return {
      totalJugadores: totalJugadores,
      lider: lider ? lider[1] : 'N/A',
      puntosMax: puntosMax,
      totalPartidas: totalPartidas,
      totalGames: totalGames,
      top3: top3
    };
    
  } catch (error) {
    logError('obtenerDatosDashboard', error);
    return [];
  }
}

function obtenerDatosMazos() {
  try {
    var ss = obtenerSpreadsheet();
    var jugadoresSheet = ss.getSheetByName(CONFIG.HOJA_JUGADORES);
    
    if (!jugadoresSheet) return [];
    
    var data = jugadoresSheet.getDataRange().getValues();
    if (data.length < 2) return [];
    
    var mazos = {};
    var totalJugadores = 0;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][1]) {
        totalJugadores++;
        var deck = data[i][2] || 'Sin Deck';
        deck = deck.trim();
        if (deck === '') deck = 'Sin Deck';
        if (mazos[deck]) {
          mazos[deck]++;
        } else {
          mazos[deck] = 1;
        }
      }
    }
    
    var mazosOrdenados = [];
    for (var deck in mazos) {
      mazosOrdenados.push({ 
        nombre: deck, 
        cantidad: mazos[deck],
        porcentaje: Math.round((mazos[deck] / totalJugadores) * 100)
      });
    }
    mazosOrdenados.sort(function(a, b) { return b.cantidad - a.cantidad; });
    
    return {
      totalJugadores: totalJugadores,
      totalMazos: mazosOrdenados.length,
      mazos: mazosOrdenados
    };
    
  } catch (error) {
    logError('obtenerDatosMazos', error);
    return [];
  }
}

function obtenerDatosCierre() {
  try {
    var ss = obtenerSpreadsheet();
    var clasificacionSheet = ss.getSheetByName(CONFIG.HOJA_CLASIFICACION);
    var jugadoresSheet = ss.getSheetByName(CONFIG.HOJA_JUGADORES);
    
    if (!clasificacionSheet || !jugadoresSheet) return null;
    
    var dataClasif = clasificacionSheet.getDataRange().getValues();
    var dataJugadores = jugadoresSheet.getDataRange().getValues();
    
    if (dataClasif.length < 2) return null;
    
    var clasificacion = [];
    var campeon = null;
    
    for (var i = 1; i < dataClasif.length; i++) {
      if (dataClasif[i][0] && dataClasif[i][1]) {
        var nombre = dataClasif[i][1];
        var pts = dataClasif[i][3] || 0;
        var pgw = dataClasif[i][5] || '0%';
        clasificacion.push({ nombre: nombre, pts: pts, pgw: pgw });
        if (i === 1) campeon = nombre;
      }
    }
    
    var premios = [];
    if (clasificacion.length > 0) {
      premios.push('🥇 Campeón: ' + clasificacion[0].nombre + ' - ' + clasificacion[0].pts + ' pts');
      if (clasificacion.length > 1) {
        premios.push('🥈 Subcampeón: ' + clasificacion[1].nombre + ' - ' + clasificacion[1].pts + ' pts');
      }
      if (clasificacion.length > 2) {
        premios.push('🥉 Tercer Lugar: ' + clasificacion[2].nombre + ' - ' + clasificacion[2].pts + ' pts');
      }
    }
    
    var mazos = {};
    var totalJugadores = 0;
    for (var i = 1; i < dataJugadores.length; i++) {
      if (dataJugadores[i][0] && dataJugadores[i][1]) {
        totalJugadores++;
        var deck = dataJugadores[i][2] || 'Sin Deck';
        deck = deck.trim();
        if (deck === '') deck = 'Sin Deck';
        if (mazos[deck]) {
          mazos[deck]++;
        } else {
          mazos[deck] = 1;
        }
      }
    }
    
    var mazosOrdenados = [];
    for (var deck in mazos) {
      mazosOrdenados.push({ 
        nombre: deck, 
        cantidad: mazos[deck],
        porcentaje: Math.round((mazos[deck] / totalJugadores) * 100)
      });
    }
    mazosOrdenados.sort(function(a, b) { return b.cantidad - a.cantidad; });
    
    return {
      campeon: campeon,
      clasificacion: clasificacion,
      premios: premios,
      topMazos: mazosOrdenados.slice(0, 3)
    };
    
  } catch (error) {
    logError('obtenerDatosCierre', error);
    return null;
  }
}

function mostrarClasificacionMobile() {
  return '✅ Usa el panel de clasificación desde el menú principal';
}

function crearDashboardMobile() {
  try {
    var ss = obtenerSpreadsheet();
    var clasificacion = ss.getSheetByName(CONFIG.HOJA_CLASIFICACION);
    
    if (!clasificacion) return '❌ No hay datos de clasificación';
    
    var data = clasificacion.getDataRange().getValues();
    if (data.length < 2) return '❌ No hay datos de clasificación';
    
    var totalJugadores = data.length - 1;
    var lider = data[1];
    var puntosMax = lider ? lider[3] || 0 : 0;
    var totalPartidas = 0;
    var totalGames = 0;
    
    for (var i = 1; i < data.length; i++) {
      totalPartidas += data[i][7] || 0;
      totalGames += data[i][8] || 0;
    }
    
    var mensaje = '📊 DASHBOARD\n';
    mensaje += '═'.repeat(35) + '\n\n';
    mensaje += '👥 Jugadores: ' + totalJugadores + '\n';
    mensaje += '🏆 Líder: ' + (lider ? lider[1] : 'N/A') + '\n';
    mensaje += '⭐ Puntos Máximos: ' + puntosMax + '\n';
    mensaje += '🎯 Partidas: ' + totalPartidas + '\n';
    mensaje += '🎮 Games: ' + totalGames + '\n\n';
    mensaje += '🏅 TOP 3\n';
    mensaje += '─'.repeat(35) + '\n';
    for (var i = 1; i < Math.min(4, data.length); i++) {
      var icono = i === 1 ? '🥇' : (i === 2 ? '🥈' : '🥉');
      mensaje += icono + ' ' + data[i][1] + ' - ' + data[i][3] + ' pts\n';
    }
    
    return mensaje;
  } catch (error) {
    logError('crearDashboardMobile', error);
    return '❌ Error: ' + error.message;
  }
}

function mostrarEstadisticasMazos() {
  try {
    var ss = obtenerSpreadsheet();
    var jugadoresSheet = ss.getSheetByName(CONFIG.HOJA_JUGADORES);
    
    if (!jugadoresSheet) return '❌ No hay jugadores registrados';
    
    var data = jugadoresSheet.getDataRange().getValues();
    if (data.length < 2) return '❌ No hay jugadores registrados';
    
    var mazos = {};
    var totalJugadores = 0;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][1]) {
        totalJugadores++;
        var deck = data[i][2] || 'Sin Deck';
        deck = deck.trim();
        if (deck === '') deck = 'Sin Deck';
        if (mazos[deck]) {
          mazos[deck]++;
        } else {
          mazos[deck] = 1;
        }
      }
    }
    
    var mazosOrdenados = [];
    for (var deck in mazos) {
      mazosOrdenados.push({ nombre: deck, cantidad: mazos[deck] });
    }
    mazosOrdenados.sort(function(a, b) { return b.cantidad - a.cantidad; });
    
    var mensaje = '🃏 ESTADÍSTICAS DE MAZOS\n';
    mensaje += '═'.repeat(35) + '\n\n';
    mensaje += '👥 Total jugadores: ' + totalJugadores + '\n';
    mensaje += '🎴 Total mazos distintos: ' + mazosOrdenados.length + '\n\n';
    mensaje += '📋 DISTRIBUCIÓN:\n';
    mensaje += '─'.repeat(35) + '\n';
    
    for (var i = 0; i < mazosOrdenados.length; i++) {
      var m = mazosOrdenados[i];
      var porcentaje = Math.round((m.cantidad / totalJugadores) * 100);
      var icono = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : (i+1)+'.'));
      mensaje += icono + ' ' + m.nombre + ' | ' + m.cantidad + ' jug. (' + porcentaje + '%)\n';
    }
    
    return mensaje;
  } catch (error) {
    logError('mostrarEstadisticasMazos', error);
    return '❌ Error: ' + error.message;
  }
}

function mostrarCierreTorneo() {
  try {
    var ss = obtenerSpreadsheet();
    var clasificacionSheet = ss.getSheetByName(CONFIG.HOJA_CLASIFICACION);
    var jugadoresSheet = ss.getSheetByName(CONFIG.HOJA_JUGADORES);
    
    if (!clasificacionSheet || !jugadoresSheet) return '❌ No hay datos del torneo';
    
    var dataClasif = clasificacionSheet.getDataRange().getValues();
    var dataJugadores = jugadoresSheet.getDataRange().getValues();
    
    if (dataClasif.length < 2) return '❌ No hay datos de clasificación';
    
    var mensaje = '🏆 CIERRE DE TORNEO\n';
    mensaje += '═'.repeat(35) + '\n\n';
    
    mensaje += '📋 CLASIFICACIÓN FINAL\n';
    mensaje += '─'.repeat(35) + '\n';
    for (var i = 1; i < dataClasif.length; i++) {
      if (dataClasif[i][0] && dataClasif[i][1]) {
        var pos = dataClasif[i][0];
        var nombre = dataClasif[i][1];
        var pts = dataClasif[i][3] || 0;
        var pgw = dataClasif[i][5] || '0%';
        var icono = '';
        if (pos === 1) icono = '🥇 ';
        else if (pos === 2) icono = '🥈 ';
        else if (pos === 3) icono = '🥉 ';
        mensaje += icono + pos + '. ' + nombre + ' - ' + pts + ' pts | ' + pgw + '\n';
      }
    }
    
    var ganador = dataClasif.length > 1 ? dataClasif[1] : null;
    var segundo = dataClasif.length > 2 ? dataClasif[2] : null;
    var tercero = dataClasif.length > 3 ? dataClasif[3] : null;
    
    if (ganador || segundo || tercero) {
      mensaje += '\n🏅 PREMIACIONES\n';
      mensaje += '─'.repeat(35) + '\n';
      if (ganador) mensaje += '🥇 Campeón: ' + ganador[1] + ' (' + (ganador[2] || 'Sin Deck') + ') - ' + ganador[3] + ' pts\n';
      if (segundo) mensaje += '🥈 Subcampeón: ' + segundo[1] + ' (' + (segundo[2] || 'Sin Deck') + ') - ' + segundo[3] + ' pts\n';
      if (tercero) mensaje += '🥉 Tercer Lugar: ' + tercero[1] + ' (' + (tercero[2] || 'Sin Deck') + ') - ' + tercero[3] + ' pts\n';
    }
    
    var mazos = {};
    var totalJugadores = 0;
    for (var i = 1; i < dataJugadores.length; i++) {
      if (dataJugadores[i][0] && dataJugadores[i][1]) {
        totalJugadores++;
        var deck = dataJugadores[i][2] || 'Sin Deck';
        deck = deck.trim();
        if (deck === '') deck = 'Sin Deck';
        if (mazos[deck]) {
          mazos[deck]++;
        } else {
          mazos[deck] = 1;
        }
      }
    }
    
    var mazosOrdenados = [];
    for (var deck in mazos) {
      mazosOrdenados.push({ nombre: deck, cantidad: mazos[deck] });
    }
    mazosOrdenados.sort(function(a, b) { return b.cantidad - a.cantidad; });
    
    if (mazosOrdenados.length > 0) {
      mensaje += '\n🃏 TOP MAZOS\n';
      mensaje += '─'.repeat(35) + '\n';
      for (var i = 0; i < Math.min(3, mazosOrdenados.length); i++) {
        var m = mazosOrdenados[i];
        var porcentaje = Math.round((m.cantidad / totalJugadores) * 100);
        var icono = i === 0 ? '🥇' : (i === 1 ? '🥈' : '🥉');
        mensaje += icono + ' ' + m.nombre + ' - ' + m.cantidad + ' jug. (' + porcentaje + '%)\n';
      }
    }
    
    mensaje += '\n' + '═'.repeat(35) + '\n';
    mensaje += '🎉 ¡TORNEO FINALIZADO! 🎉\n';
    mensaje += '🏆 Campeón: ' + (ganador ? ganador[1] : 'N/A');
    
    return mensaje;
  } catch (error) {
    logError('mostrarCierreTorneo', error);
    return '❌ Error: ' + error.message;
  }
}

function reiniciarTorneo() {
  try {
    var ss = obtenerSpreadsheet();
    var hojas = [CONFIG.HOJA_JUGADORES, CONFIG.HOJA_PARTIDAS, CONFIG.HOJA_CLASIFICACION];
    
    for (var h = 0; h < hojas.length; h++) {
      var sheet = ss.getSheetByName(hojas[h]);
      if (sheet) {
        sheet.clear();
        if (hojas[h] === CONFIG.HOJA_JUGADORES) {
          sheet.appendRow(['ID', 'Nombre', 'Deck', 'PTS', 'Partidas', 'Games G', 'Games J', 'Oponentes', 'Bye']);
        } else if (hojas[h] === CONFIG.HOJA_PARTIDAS) {
          sheet.appendRow(['Ronda', 'Mesa', 'Jugador1', 'Jugador2', 'Games J1', 'Games J2', 'Ganador', 'Resultado']);
        } else if (hojas[h] === CONFIG.HOJA_CLASIFICACION) {
          sheet.appendRow(['Pos', 'Jugador', 'Deck', 'PTS', 'OMW', 'PGW', 'OGW', 'Partidas', 'Games G', 'Games J']);
        }
      }
    }
    
    return "✅ Torneo reiniciado correctamente";
  } catch (error) {
    logError('reiniciarTorneo', error);
    return "❌ Error: " + error.message;
  }
}
