const materiasComputacion = [
  // PRIMER AÑO
  { "nro": 1, "nombre": "INGLES", "anio": 1, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 2, "nombre": "CALCULO I", "anio": 1, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 3, "nombre": "ALGEBRA I", "anio": 1, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 4, "nombre": "INTRODUCCION A LA COMPUTACION", "anio": 1, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 5, "nombre": "PROGRAMACION I", "anio": 1, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [4], "req_aprob_cursar": [], "req_aprob_rendir": [4] },
  { "nro": 6, "nombre": "MATEMATICA DISCRETA", "anio": 1, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [3], "req_aprob_cursar": [], "req_aprob_rendir": [3] },
  { "nro": 7, "nombre": "CALCULO II", "anio": 1, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [2], "req_aprob_cursar": [], "req_aprob_rendir": [2] },

  // SEGUNDO AÑO
  { "nro": 8, "nombre": "PROBABILIDAD Y ESTADISTICA", "anio": 2, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [2], "req_aprob_cursar": [], "req_aprob_rendir": [2] },
  { "nro": 9, "nombre": "PROGRAMACION II", "anio": 2, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [5], "req_aprob_cursar": [], "req_aprob_rendir": [5] },
  { "nro": 10, "nombre": "ARQUITECTURA DEL PROCESADOR I", "anio": 2, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [3, 5], "req_aprob_cursar": [4], "req_aprob_rendir": [3, 5] },
  { "nro": 11, "nombre": "ALGEBRA II", "anio": 2, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [3], "req_aprob_cursar": [], "req_aprob_rendir": [3] },
  { "nro": 12, "nombre": "ESTRUCTURA DE DATOS Y ALGORITMOS", "anio": 2, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [6, 5, 8], "req_aprob_cursar": [4], "req_aprob_rendir": [6, 5, 8] },
  { "nro": 13, "nombre": "ASPECTOS LEGALES, SOCIALES, AUDITORIA Y PERITAJE INFORMÁTICOS", "anio": 2, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 14, "nombre": "ANALISIS COMPARATIVO DE LENGUAJES", "anio": 2, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [10, 9], "req_aprob_cursar": [5], "req_aprob_rendir": [10, 9] },

  // TERCER AÑO
  { "nro": 15, "nombre": "SISTEMAS OPERATIVOS", "anio": 3, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [9], "req_aprob_cursar": [10], "req_aprob_rendir": [2, 9] },
  { "nro": 16, "nombre": "INGENIERIA DE SOFTWARE I", "anio": 3, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [9, 12], "req_aprob_cursar": [5], "req_aprob_rendir": [9] },
  { "nro": 17, "nombre": "ORGANIZACION DE ARCHIVOS Y BASES DE DATOS I", "anio": 3, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [12], "req_aprob_cursar": [5], "req_aprob_rendir": [12] },
  { "nro": 18, "nombre": "INGENIERIA DE SOFTWARE II", "anio": 3, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [16, 17], "req_aprob_cursar": [], "req_aprob_rendir": [16, 17] },
  { "nro": 19, "nombre": "ARQUITECTURA DEL PROCESADOR II", "anio": 3, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [15], "req_aprob_cursar": [], "req_aprob_rendir": [15] },
  { "nro": 20, "nombre": "REDES DE COMPUTADORAS", "anio": 3, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [10, 15, 17], "req_aprob_cursar": [7, 9], "req_aprob_rendir": [10, 15, 17] },

  // CUARTO AÑO
  { "nro": 21, "nombre": "PLANEAMIENTO INFORMATICO", "anio": 4, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [18], "req_aprob_cursar": [9], "req_aprob_rendir": [18] },
  { "nro": 22, "nombre": "LOGICA PARA COMPUTACION", "anio": 4, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [12], "req_aprob_cursar": [6], "req_aprob_rendir": [12] },
  { "nro": 23, "nombre": "INTELIGENCIA ARTIFICIAL", "anio": 4, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [17, 14], "req_aprob_cursar": [8], "req_aprob_rendir": [14, 17] },
  { "nro": 24, "nombre": "AUTOMATAS Y LENGUAJES", "anio": 4, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [14, 12], "req_aprob_cursar": [6, 9], "req_aprob_rendir": [14, 12] },
  { "nro": 25, "nombre": "COMPUTABILIDAD Y COMPLEJIDAD", "anio": 4, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [24], "req_aprob_cursar": [12], "req_aprob_rendir": [24] },
  { "nro": 26, "nombre": "BASE DE DATOS II", "anio": 4, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [17, 22], "req_aprob_cursar": [12], "req_aprob_rendir": [22, 17] },
  { "nro": 27, "nombre": "MODELOS Y SIMULACION", "anio": 4, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [15], "req_aprob_cursar": [2, 7], "req_aprob_rendir": [15] },

  // QUINTO AÑO
  { "nro": 28, "nombre": "TRABAJO FINAL", "anio": 5, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 29, "nombre": "SISTEMAS DISTRIBUIDOS Y PARALELISMO", "anio": 5, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [19, 20], "req_aprob_cursar": [15], "req_aprob_rendir": [19, 20] },
  { "nro": 30, "nombre": "OPTATIVA 1", "anio": 5, "cuatrimestre": "1", "tipo": "optativa", "req_reg_cursar": [], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 31, "nombre": "OPTATIVA 2", "anio": 5, "cuatrimestre": "1", "tipo": "optativa", "req_reg_cursar": [], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 32, "nombre": "DISEÑO Y CONSTRUCCION DE COMPILADORES", "anio": 5, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [17, 24], "req_aprob_cursar": [], "req_aprob_rendir": [24, 17] },
  { "nro": 33, "nombre": "OPTATIVA 3", "anio": 5, "cuatrimestre": "2", "tipo": "optativa", "req_reg_cursar": [], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 34, "nombre": "OPTATIVA 4", "anio": 5, "cuatrimestre": "2", "tipo": "optativa", "req_reg_cursar": [], "req_aprob_cursar": [], "req_aprob_rendir": [] }
];

module.exports = { materiasComputacion };