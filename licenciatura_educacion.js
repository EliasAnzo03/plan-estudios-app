// Array de materias de la Licenciatura en Ciencias de la Educación (plan 20/99)
const materiasEducacion = [
  // --- PRIMER AÑO ---
  { "nro": 1, "nombre": "NIVEL I TALLER LA PROBLEMATICA EN LA REALIDAD EDUCATIVA", "anio": 1, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 2, "nombre": "TALLER: LOS SUJETOS DE EDUCACION EN SUS PRACTICAS DE APRENDIZAJE", "anio": 1, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 3, "nombre": "PEDAGOGIA", "anio": 1, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 4, "nombre": "FUNDAMENTOS NEUROBIOLOGICOS DEL DESARROLLO Y DEL APRENDIZAJE", "anio": 1, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 5, "nombre": "PSICOLOGIA DEL DESARROLLO", "anio": 1, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 6, "nombre": "TEORIA SOCIOLOGICA", "anio": 1, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 7, "nombre": "FILOSOFIA Y ETICA", "anio": 1, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [3], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  // --- SEGUNDO AÑO ---
  { "nro": 8, "nombre": "NIVEL II TALLER SUJETOS DE APRENDIZAJE EN DIFERENTES CONTEXTOS.", "anio": 2, "cuatrimestre": "A", "tipo": "obligatoria", "req_reg_cursar": [1, 6], "req_aprob_cursar": [2], "req_aprob_rendir": [1] },
  { "nro": 9, "nombre": "SOCIOLOGIA DE LA EDUCACION", "anio": 2, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [6], "req_aprob_cursar": [3], "req_aprob_rendir": [6] },
  { "nro": 10, "nombre": "PSICOLOGIA DEL APRENDIZAJE", "anio": 2, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [2, 4, 5], "req_aprob_cursar": [], "req_aprob_rendir": [2] },
  { "nro": 11, "nombre": "MARGINALIDAD Y EXCLUSION URBANA Y RURAL", "anio": 2, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [6], "req_aprob_cursar": [3], "req_aprob_rendir": [6] },
  { "nro": 12, "nombre": "EDUCACION DE ADULTOS", "anio": 2, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [5, 6], "req_aprob_cursar": [], "req_aprob_rendir": [6] },
  { "nro": 13, "nombre": "FILOSOFIA DE LA EDUCACION", "anio": 2, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [7], "req_aprob_cursar": [3], "req_aprob_rendir": [7] },
  { "nro": 14, "nombre": "ANTROPOLOGIA Y EDUCACION", "anio": 2, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [9], "req_aprob_cursar": [6], "req_aprob_rendir": [] },
  { "nro": 15, "nombre": "HISTORIA GENERAL DE LA EDUCACION", "anio": 2, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [7], "req_aprob_cursar": [3], "req_aprob_rendir": [7] },
  { "nro": 16, "nombre": "PSICOLOGIA SOCIAL", "anio": 2, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [5, 6], "req_aprob_cursar": [], "req_aprob_rendir": [5] },
  // --- TERCER AÑO ---
  { "nro": 17, "nombre": "NIVEL III LA PROBLEMATICA INSTITUCIONAL", "anio": 3, "cuatrimestre": "A", "tipo": "obligatoria", "req_reg_cursar": [8, 9, 11, 13], "req_aprob_cursar": [], "req_aprob_rendir": [8] },
  { "nro": 18, "nombre": "DIDACTICA Y CURRICULUM", "anio": 3, "cuatrimestre": "A", "tipo": "obligatoria", "req_reg_cursar": [], "req_aprob_cursar": [9, 10], "req_aprob_rendir": [] },
  { "nro": 19, "nombre": "GOBIERNO, ORGANIZACION Y GESTION INSTITUCIONAL", "anio": 3, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [9], "req_aprob_cursar": [6], "req_aprob_rendir": [9] },
  { "nro": 20, "nombre": "EPISTEMOLOGIA DE LAS CIENCIAS SOCIALES", "anio": 3, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [13], "req_aprob_cursar": [9], "req_aprob_rendir": [13] },
  { "nro": 21, "nombre": "HISTORIA DE LA EDUCACION LATINOAMERICANA Y ARGENTINA", "anio": 3, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 22, "nombre": "INVESTIGACION EDUCATIVA I", "anio": 3, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [13], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 23, "nombre": "POLITICA EDUCACIONAL", "anio": 3, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [15, 21], "req_aprob_cursar": [9], "req_aprob_rendir": [15] },
  // --- CUARTO AÑO ---
  { "nro": 24, "nombre": "SEMINARIO EVALUACION EDUCACIONAL", "anio": 4, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [18, 23], "req_aprob_cursar": [], "req_aprob_rendir": [18] },
  { "nro": 25, "nombre": "INVESTIGACION EDUCATIVA II", "anio": 4, "cuatrimestre": "A", "tipo": "obligatoria", "req_reg_cursar": [20, 22], "req_aprob_cursar": [], "req_aprob_rendir": [22] },
  { "nro": 26, "nombre": "EDUCACION Y MEDIOS", "anio": 4, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [18], "req_aprob_cursar": [10], "req_aprob_rendir": [] },
  { "nro": 27, "nombre": "PROBLEMATICA PEDAGOGICA DIDACTICA DEL NIVEL SUPERIOR", "anio": 4, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [18, 19, 23], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 28, "nombre": "PROBLEMAS PEDAGOGICOS DIDACTICOS DE LOS DISTINTOS NIVELES DEL SISTEMA EDUCATIVO I", "anio": 4, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [18, 19, 23], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 29, "nombre": "IDIOMA EXTRANJERO LIC.EN CS.20/99", "anio": 4, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 30, "nombre": "OPTATIVO:LICENCIATURA EN CIENCIAS 20/99", "anio": 4, "cuatrimestre": "1", "tipo": "optativa", "req_reg_cursar": [], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 31, "nombre": "PROBLEMATICA PEDAGOGICO DIDACTICA DE LOS DISTINTOS NIVELES DEL SISTEMA EDUCATIVO II", "anio": 4, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [18, 23], "req_aprob_cursar": [19], "req_aprob_rendir": [] },
  { "nro": 32, "nombre": "SEMINARIO CONDICIONES ESTRUCTURALES DEL TRABAJO DOCENTE", "anio": 4, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [18, 23], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 33, "nombre": "EDUCACION NO FORMAL", "anio": 4, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [], "req_aprob_cursar": [11, 12], "req_aprob_rendir": [] },
  // --- QUINTO AÑO ---
  { "nro": 34, "nombre": "NIVEL IV: LA PRACTICA INVESTIGATIVA", "anio": 5, "cuatrimestre": "A", "tipo": "obligatoria", "req_reg_cursar": [17, 25], "req_aprob_cursar": [], "req_aprob_rendir": [17, 22, 25] },
  { "nro": 35, "nombre": "TRABAJO FINAL", "anio": 5, "cuatrimestre": "A", "tipo": "obligatoria", "req_reg_cursar": [], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 36, "nombre": "NIVEL V: PRACTICA PROFESIONAL", "anio": 5, "cuatrimestre": "A", "tipo": "obligatoria", "req_reg_cursar": [17], "req_aprob_cursar": [], "req_aprob_rendir": [17] },
  { "nro": 37, "nombre": "TESIS (04MA01022)", "anio": 5, "cuatrimestre": "A", "tipo": "obligatoria", "req_reg_cursar": [], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 38, "nombre": "TESIS (04MA00184)", "anio": 5, "cuatrimestre": "A", "tipo": "obligatoria", "req_reg_cursar": [], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 39, "nombre": "ECONOMIA Y EDUCACION", "anio": 5, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [], "req_aprob_cursar": [23], "req_aprob_rendir": [] },
  { "nro": 40, "nombre": "FORMACION Y CAPACITACION EN DISTINTOS AMBITOS LABORALES", "anio": 5, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [33], "req_aprob_cursar": [27], "req_aprob_rendir": [33] },
  { "nro": 41, "nombre": "EDUCACION ESPECIAL", "anio": 5, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [18], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 42, "nombre": "PLANEAMIENTO EDUCACIONAL", "anio": 5, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [22, 27], "req_aprob_cursar": [19], "req_aprob_rendir": [] },
  { "nro": 43, "nombre": "TALLER DE TESIS", "anio": 5, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [25], "req_aprob_cursar": [22], "req_aprob_rendir": [25] },
  { "nro": 44, "nombre": "EDUCACION A DISTANCIA", "anio": 5, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [33], "req_aprob_cursar": [26], "req_aprob_rendir": [] },
  { "nro": 45, "nombre": "ANALISIS INSTITUCIONAL", "anio": 5, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [], "req_aprob_cursar": [19, 23], "req_aprob_rendir": [] },
  { "nro": 46, "nombre": "SEMINARIO ORGANIZACION SOCIAL DEL TRABAJO Y EDUCACION", "anio": 5, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [16, 32], "req_aprob_cursar": [], "req_aprob_rendir": [16] }
];

module.exports = { materiasEducacion };
