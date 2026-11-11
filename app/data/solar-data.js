// 生成物: tools/build_data.py が JPL / NASA の公開表から抜き出した数値。手で編集しない。
export const DATA = {
 "generatedFrom": {
  "rotation": "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc",
  "elements": "https://ssd.jpl.nasa.gov/planets/approx_pos.html",
  "planetPhys": "https://ssd.jpl.nasa.gov/planets/phys_par.html",
  "satElements": "https://ssd.jpl.nasa.gov/sats/elem/",
  "satPhys": "https://ssd.jpl.nasa.gov/sats/phys_par/",
  "dwarfElements": "https://ssd-api.jpl.nasa.gov/sbdb.api",
  "factSheets": "https://nssdc.gsfc.nasa.gov/planetary/factsheet/",
  "retrieved": "2026-11-11"
 },
 "planets": {
  "mercury": {
   "el1": {
    "a": [
     0.38709927,
     3.7e-07
    ],
    "e": [
     0.20563593,
     1.906e-05
    ],
    "I": [
     7.00497902,
     -0.00594749
    ],
    "L": [
     252.2503235,
     149472.67411175
    ],
    "peri": [
     77.45779628,
     0.16047689
    ],
    "node": [
     48.33076593,
     -0.12534081
    ]
   },
   "el2": {
    "a": [
     0.38709843,
     0.0
    ],
    "e": [
     0.20563661,
     2.123e-05
    ],
    "I": [
     7.00559432,
     -0.00590158
    ],
    "L": [
     252.25166724,
     149472.67486623
    ],
    "peri": [
     77.45771895,
     0.15940013
    ],
    "node": [
     48.33961819,
     -0.12214182
    ]
   },
   "phys": {
    "eqRadius": 2440.53,
    "meanRadius": 2439.4,
    "mass": 0.330103,
    "density": 5.4289,
    "rotPeriodDays": 58.6462,
    "orbPeriodYears": 0.2408467,
    "albedo": 0.106,
    "gravity": 3.7,
    "escapeV": 4.25
   },
   "fact": {
    "rotHours": 1407.6,
    "dayHours": 4222.6,
    "orbVelocity": 47.4,
    "obliquity": 0.034,
    "meanTempC": 167.0,
    "pressureBar": 0.0,
    "moons": 0.0
   },
   "pole": {
    "ra": [
     281.01,
     -0.033
    ],
    "dec": [
     61.414,
     -0.005
    ]
   }
  },
  "venus": {
   "el1": {
    "a": [
     0.72333566,
     3.9e-06
    ],
    "e": [
     0.00677672,
     -4.107e-05
    ],
    "I": [
     3.39467605,
     -0.0007889
    ],
    "L": [
     181.9790995,
     58517.81538729
    ],
    "peri": [
     131.60246718,
     0.00268329
    ],
    "node": [
     76.67984255,
     -0.27769418
    ]
   },
   "el2": {
    "a": [
     0.72332102,
     -2.6e-07
    ],
    "e": [
     0.00676399,
     -5.107e-05
    ],
    "I": [
     3.39777545,
     0.00043494
    ],
    "L": [
     181.9797085,
     58517.8156026
    ],
    "peri": [
     131.76755713,
     0.05679648
    ],
    "node": [
     76.67261496,
     -0.27274174
    ]
   },
   "phys": {
    "eqRadius": 6051.8,
    "meanRadius": 6051.8,
    "mass": 4.86731,
    "density": 5.243,
    "rotPeriodDays": -243.018,
    "orbPeriodYears": 0.61519726,
    "albedo": 0.65,
    "gravity": 8.87,
    "escapeV": 10.36
   },
   "fact": {
    "rotHours": -5832.5,
    "dayHours": 2802.0,
    "orbVelocity": 35.0,
    "obliquity": 177.4,
    "meanTempC": 464.0,
    "pressureBar": 92.0,
    "moons": 0.0
   },
   "pole": {
    "ra": [
     272.76,
     0.0
    ],
    "dec": [
     67.16,
     0.0
    ]
   }
  },
  "earth": {
   "el1": {
    "a": [
     1.00000261,
     5.62e-06
    ],
    "e": [
     0.01671123,
     -4.392e-05
    ],
    "I": [
     -1.531e-05,
     -0.01294668
    ],
    "L": [
     100.46457166,
     35999.37244981
    ],
    "peri": [
     102.93768193,
     0.32327364
    ],
    "node": [
     0.0,
     0.0
    ]
   },
   "el2": {
    "a": [
     1.00000018,
     -3e-08
    ],
    "e": [
     0.01673163,
     -3.661e-05
    ],
    "I": [
     -0.00054346,
     -0.01337178
    ],
    "L": [
     100.46691572,
     35999.37306329
    ],
    "peri": [
     102.93005885,
     0.3179526
    ],
    "node": [
     -5.11260389,
     -0.24123856
    ]
   },
   "phys": {
    "eqRadius": 6378.1366,
    "meanRadius": 6371.0084,
    "mass": 5.97217,
    "density": 5.5134,
    "rotPeriodDays": 0.99726968,
    "orbPeriodYears": 1.0000174,
    "albedo": 0.367,
    "gravity": 9.8,
    "escapeV": 11.19
   },
   "fact": {
    "rotHours": 23.9,
    "dayHours": 24.0,
    "orbVelocity": 29.8,
    "obliquity": 23.4,
    "meanTempC": 15.0,
    "pressureBar": 1.0,
    "moons": 1.0
   },
   "pole": {
    "ra": [
     0.0,
     -0.641
    ],
    "dec": [
     90.0,
     -0.557
    ]
   }
  },
  "mars": {
   "el1": {
    "a": [
     1.52371034,
     1.847e-05
    ],
    "e": [
     0.0933941,
     7.882e-05
    ],
    "I": [
     1.84969142,
     -0.00813131
    ],
    "L": [
     -4.55343205,
     19140.30268499
    ],
    "peri": [
     -23.94362959,
     0.44441088
    ],
    "node": [
     49.55953891,
     -0.29257343
    ]
   },
   "el2": {
    "a": [
     1.52371243,
     9.7e-07
    ],
    "e": [
     0.09336511,
     9.149e-05
    ],
    "I": [
     1.85181869,
     -0.00724757
    ],
    "L": [
     -4.56813164,
     19140.29934243
    ],
    "peri": [
     -23.91744784,
     0.45223625
    ],
    "node": [
     49.71320984,
     -0.26852431
    ]
   },
   "phys": {
    "eqRadius": 3396.19,
    "meanRadius": 3389.5,
    "mass": 0.641691,
    "density": 3.934,
    "rotPeriodDays": 1.02595676,
    "orbPeriodYears": 1.8808476,
    "albedo": 0.15,
    "gravity": 3.71,
    "escapeV": 5.03
   },
   "fact": {
    "rotHours": 24.6,
    "dayHours": 24.7,
    "orbVelocity": 24.1,
    "obliquity": 25.2,
    "meanTempC": -65.0,
    "pressureBar": 0.01,
    "moons": 2.0
   },
   "pole": {
    "ra": [
     317.681,
     -0.106
    ],
    "dec": [
     52.887,
     -0.061
    ]
   }
  },
  "jupiter": {
   "el1": {
    "a": [
     5.202887,
     -0.00011607
    ],
    "e": [
     0.04838624,
     -0.00013253
    ],
    "I": [
     1.30439695,
     -0.00183714
    ],
    "L": [
     34.39644051,
     3034.74612775
    ],
    "peri": [
     14.72847983,
     0.21252668
    ],
    "node": [
     100.47390909,
     0.20469106
    ]
   },
   "el2": {
    "a": [
     5.20248019,
     -2.864e-05
    ],
    "e": [
     0.0485359,
     0.00018026
    ],
    "I": [
     1.29861416,
     -0.00322699
    ],
    "L": [
     34.33479152,
     3034.90371757
    ],
    "peri": [
     14.27495244,
     0.18199196
    ],
    "node": [
     100.29282654,
     0.13024619
    ],
    "bcsf": [
     -0.00012452,
     0.0606406,
     -0.35635438,
     38.35125
    ]
   },
   "phys": {
    "eqRadius": 71492.0,
    "meanRadius": 69911.0,
    "mass": 1898.125,
    "density": 1.3262,
    "rotPeriodDays": 0.41354,
    "orbPeriodYears": 11.862615,
    "albedo": 0.52,
    "gravity": 24.79,
    "escapeV": 60.2
   },
   "fact": {
    "rotHours": 9.9,
    "dayHours": 9.9,
    "orbVelocity": 13.1,
    "obliquity": 3.1,
    "meanTempC": -110.0,
    "pressureBar": null,
    "moons": 95.0
   },
   "pole": {
    "ra": [
     268.057,
     -0.006
    ],
    "dec": [
     64.495,
     0.002
    ]
   }
  },
  "saturn": {
   "el1": {
    "a": [
     9.53667594,
     -0.0012506
    ],
    "e": [
     0.05386179,
     -0.00050991
    ],
    "I": [
     2.48599187,
     0.00193609
    ],
    "L": [
     49.95424423,
     1222.49362201
    ],
    "peri": [
     92.59887831,
     -0.41897216
    ],
    "node": [
     113.66242448,
     -0.28867794
    ]
   },
   "el2": {
    "a": [
     9.54149883,
     -3.065e-05
    ],
    "e": [
     0.05550825,
     -0.00032044
    ],
    "I": [
     2.49424102,
     0.00451969
    ],
    "L": [
     50.07571329,
     1222.11494724
    ],
    "peri": [
     92.86136063,
     0.54179478
    ],
    "node": [
     113.63998702,
     -0.25015002
    ],
    "bcsf": [
     0.00025899,
     -0.13434469,
     0.87320147,
     38.35125
    ]
   },
   "phys": {
    "eqRadius": 60268.0,
    "meanRadius": 58232.0,
    "mass": 568.317,
    "density": 0.6871,
    "rotPeriodDays": 0.44401,
    "orbPeriodYears": 29.447498,
    "albedo": 0.47,
    "gravity": 10.44,
    "escapeV": 36.09
   },
   "fact": {
    "rotHours": 10.7,
    "dayHours": 10.7,
    "orbVelocity": 9.7,
    "obliquity": 26.7,
    "meanTempC": -140.0,
    "pressureBar": null,
    "moons": 274.0
   },
   "pole": {
    "ra": [
     40.589,
     -0.036
    ],
    "dec": [
     83.537,
     -0.004
    ]
   }
  },
  "uranus": {
   "el1": {
    "a": [
     19.18916464,
     -0.00196176
    ],
    "e": [
     0.04725744,
     -4.397e-05
    ],
    "I": [
     0.77263783,
     -0.00242939
    ],
    "L": [
     313.23810451,
     428.48202785
    ],
    "peri": [
     170.9542763,
     0.40805281
    ],
    "node": [
     74.01692503,
     0.04240589
    ]
   },
   "el2": {
    "a": [
     19.18797948,
     -0.00020455
    ],
    "e": [
     0.0468574,
     -1.55e-05
    ],
    "I": [
     0.77298127,
     -0.00180155
    ],
    "L": [
     314.20276625,
     428.49512595
    ],
    "peri": [
     172.43404441,
     0.09266985
    ],
    "node": [
     73.96250215,
     0.05739699
    ],
    "bcsf": [
     0.00058331,
     -0.97731848,
     0.17689245,
     7.67025
    ]
   },
   "phys": {
    "eqRadius": 25559.0,
    "meanRadius": 25362.0,
    "mass": 86.8099,
    "density": 1.27,
    "rotPeriodDays": -0.71833,
    "orbPeriodYears": 84.016846,
    "albedo": 0.51,
    "gravity": 8.87,
    "escapeV": 21.38
   },
   "fact": {
    "rotHours": -17.2,
    "dayHours": 17.2,
    "orbVelocity": 6.8,
    "obliquity": 97.8,
    "meanTempC": -195.0,
    "pressureBar": null,
    "moons": 28.0
   },
   "pole": {
    "ra": [
     257.311,
     0.0
    ],
    "dec": [
     -15.175,
     0.0
    ]
   }
  },
  "neptune": {
   "el1": {
    "a": [
     30.06992276,
     0.00026291
    ],
    "e": [
     0.00859048,
     5.105e-05
    ],
    "I": [
     1.77004347,
     0.00035372
    ],
    "L": [
     -55.12002969,
     218.45945325
    ],
    "peri": [
     44.96476227,
     -0.32241464
    ],
    "node": [
     131.78422574,
     -0.00508664
    ]
   },
   "el2": {
    "a": [
     30.06952752,
     6.447e-05
    ],
    "e": [
     0.00895439,
     8.18e-06
    ],
    "I": [
     1.7700552,
     0.000224
    ],
    "L": [
     304.22289287,
     218.46515314
    ],
    "peri": [
     46.68158724,
     0.01009938
    ],
    "node": [
     131.78635853,
     -0.00606302
    ],
    "bcsf": [
     -0.00041348,
     0.68346318,
     -0.10162547,
     7.67025
    ]
   },
   "phys": {
    "eqRadius": 24764.0,
    "meanRadius": 24622.0,
    "mass": 102.4092,
    "density": 1.638,
    "rotPeriodDays": 0.67125,
    "orbPeriodYears": 164.79132,
    "albedo": 0.41,
    "gravity": 11.15,
    "escapeV": 23.56
   },
   "fact": {
    "rotHours": 16.1,
    "dayHours": 16.1,
    "orbVelocity": 5.4,
    "obliquity": 28.3,
    "meanTempC": -200.0,
    "pressureBar": null,
    "moons": 16.0
   },
   "pole": {
    "ra": [
     299.36,
     0.0
    ],
    "dec": [
     43.46,
     0.0
    ]
   }
  }
 },
 "sun": {
  "meanRadius": 695700.0,
  "mass": 1988400.0,
  "rotHours": 609.12,
  "obliquityToEcliptic": 7.25,
  "pole": {
   "ra": [
    286.13,
    0.0
   ],
   "dec": [
    63.87,
    0.0
   ]
  }
 },
 "moons": [
  {
   "id": "moon",
   "code": 301,
   "parent": "earth",
   "name": "Moon",
   "ephemeris": "DE405/LE405",
   "frame": "ecliptic",
   "epoch": "2000-01-01.5",
   "a": 384400.0,
   "e": 0.0554,
   "w": 318.15,
   "M": 135.27,
   "i": 5.16,
   "node": 125.08,
   "P": 27.322,
   "Pw": 5.997,
   "Pnode": 18.6,
   "poleRA": null,
   "poleDec": null,
   "tilt": null,
   "gm": 4902.8,
   "meanRadius": 1737.4,
   "density": 3.344
  },
  {
   "id": "phobos",
   "code": 401,
   "parent": "mars",
   "name": "Phobos",
   "ephemeris": "MAR099",
   "frame": "laplace",
   "epoch": "2000-01-01.5",
   "a": 9375.0,
   "e": 0.015,
   "w": 216.3,
   "M": 189.7,
   "i": 1.1,
   "node": 169.2,
   "P": 0.3187,
   "Pw": 1.1,
   "Pnode": 2.3,
   "poleRA": 317.7,
   "poleDec": 52.9,
   "tilt": 0.0,
   "gm": 0.0007087,
   "meanRadius": 11.08,
   "density": 1.872
  },
  {
   "id": "deimos",
   "code": 402,
   "parent": "mars",
   "name": "Deimos",
   "ephemeris": "MAR099",
   "frame": "laplace",
   "epoch": "2000-01-01.5",
   "a": 23457.0,
   "e": 0.0,
   "w": 0.0,
   "M": 205.0,
   "i": 1.8,
   "node": 54.3,
   "P": 1.2625,
   "Pw": 0.0,
   "Pnode": 56.2,
   "poleRA": 316.6,
   "poleDec": 53.5,
   "tilt": 0.9,
   "gm": 9.62e-05,
   "meanRadius": 6.2,
   "density": 1.471
  },
  {
   "id": "io",
   "code": 501,
   "parent": "jupiter",
   "name": "Io",
   "ephemeris": "JUP365",
   "frame": "laplace",
   "epoch": "2000-01-01.5",
   "a": 421800.0,
   "e": 0.004,
   "w": 49.1,
   "M": 330.9,
   "i": 0.0,
   "node": 0.0,
   "P": 1.762732,
   "Pw": 1.333,
   "Pnode": 0.0,
   "poleRA": 268.1,
   "poleDec": 64.5,
   "tilt": 0.0,
   "gm": 5959.91547,
   "meanRadius": 1821.49,
   "density": 3.5276
  },
  {
   "id": "europa",
   "code": 502,
   "parent": "jupiter",
   "name": "Europa",
   "ephemeris": "JUP365",
   "frame": "laplace",
   "epoch": "2000-01-01.5",
   "a": 671100.0,
   "e": 0.009,
   "w": 45.0,
   "M": 345.4,
   "i": 0.5,
   "node": 184.0,
   "P": 3.525463,
   "Pw": 1.394,
   "Pnode": 30.202,
   "poleRA": 268.1,
   "poleDec": 64.5,
   "tilt": 0.0,
   "gm": 3202.7121,
   "meanRadius": 1560.8,
   "density": 3.013
  },
  {
   "id": "ganymede",
   "code": 503,
   "parent": "jupiter",
   "name": "Ganymede",
   "ephemeris": "JUP365",
   "frame": "laplace",
   "epoch": "2000-01-01.5",
   "a": 1070400.0,
   "e": 0.001,
   "w": 198.3,
   "M": 324.8,
   "i": 0.2,
   "node": 58.5,
   "P": 7.155588,
   "Pw": 68.301,
   "Pnode": 137.812,
   "poleRA": 268.2,
   "poleDec": 64.6,
   "tilt": 0.1,
   "gm": 9887.83275,
   "meanRadius": 2631.2,
   "density": 1.9416
  },
  {
   "id": "callisto",
   "code": 504,
   "parent": "jupiter",
   "name": "Callisto",
   "ephemeris": "JUP365",
   "frame": "laplace",
   "epoch": "2000-01-01.5",
   "a": 1882700.0,
   "e": 0.007,
   "w": 43.8,
   "M": 87.4,
   "i": 0.3,
   "node": 309.1,
   "P": 16.69044,
   "Pw": 277.921,
   "Pnode": 577.264,
   "poleRA": 268.7,
   "poleDec": 64.8,
   "tilt": 0.4,
   "gm": 7179.2834,
   "meanRadius": 2410.3,
   "density": 1.834
  },
  {
   "id": "mimas",
   "code": 601,
   "parent": "saturn",
   "name": "Mimas",
   "ephemeris": "SAT441",
   "frame": "laplace",
   "epoch": "2000-01-01.5",
   "a": 186000.0,
   "e": 0.02,
   "w": 160.4,
   "M": 275.3,
   "i": 1.6,
   "node": 66.2,
   "P": 0.942422,
   "Pw": 0.493,
   "Pnode": 0.986,
   "poleRA": 40.6,
   "poleDec": 83.5,
   "tilt": 0.0,
   "gm": 2.50349,
   "meanRadius": 198.2,
   "density": 1.1501
  },
  {
   "id": "enceladus",
   "code": 602,
   "parent": "saturn",
   "name": "Enceladus",
   "ephemeris": "SAT441",
   "frame": "laplace",
   "epoch": "2000-01-01.5",
   "a": 238400.0,
   "e": 0.005,
   "w": 119.5,
   "M": 57.0,
   "i": 0.0,
   "node": 0.0,
   "P": 1.370218,
   "Pw": 2.916,
   "Pnode": 0.0,
   "poleRA": 40.6,
   "poleDec": 83.5,
   "tilt": 0.0,
   "gm": 7.21037,
   "meanRadius": 252.1,
   "density": 1.6097
  },
  {
   "id": "tethys",
   "code": 603,
   "parent": "saturn",
   "name": "Tethys",
   "ephemeris": "SAT441",
   "frame": "laplace",
   "epoch": "2000-01-01.5",
   "a": 295000.0,
   "e": 0.001,
   "w": 335.3,
   "M": 0.0,
   "i": 1.1,
   "node": 273.0,
   "P": 1.887802,
   "Pw": 0.005,
   "Pnode": 4.982,
   "poleRA": 40.6,
   "poleDec": 83.5,
   "tilt": 0.0,
   "gm": 41.21353,
   "meanRadius": 531.1,
   "density": 0.984
  },
  {
   "id": "dione",
   "code": 604,
   "parent": "saturn",
   "name": "Dione",
   "ephemeris": "SAT441",
   "frame": "laplace",
   "epoch": "2000-01-01.5",
   "a": 377700.0,
   "e": 0.002,
   "w": 116.0,
   "M": 212.0,
   "i": 0.0,
   "node": 0.0,
   "P": 2.736916,
   "Pw": 11.698,
   "Pnode": 0.0,
   "poleRA": 40.6,
   "poleDec": 83.5,
   "tilt": 0.0,
   "gm": 73.11607,
   "meanRadius": 561.4,
   "density": 1.4781
  },
  {
   "id": "rhea",
   "code": 605,
   "parent": "saturn",
   "name": "Rhea",
   "ephemeris": "SAT441",
   "frame": "laplace",
   "epoch": "2000-01-01.5",
   "a": 527200.0,
   "e": 0.001,
   "w": 44.3,
   "M": 31.5,
   "i": 0.3,
   "node": 133.7,
   "P": 4.517503,
   "Pw": 33.939,
   "Pnode": 35.775,
   "poleRA": 40.6,
   "poleDec": 83.5,
   "tilt": 0.0,
   "gm": 153.94175,
   "meanRadius": 763.5,
   "density": 1.2372
  },
  {
   "id": "titan",
   "code": 606,
   "parent": "saturn",
   "name": "Titan",
   "ephemeris": "SAT441",
   "frame": "laplace",
   "epoch": "2000-01-01.5",
   "a": 1221900.0,
   "e": 0.029,
   "w": 78.3,
   "M": 11.7,
   "i": 0.3,
   "node": 78.6,
   "P": 15.945448,
   "Pw": 346.68,
   "Pnode": 687.37,
   "poleRA": 36.4,
   "poleDec": 84.0,
   "tilt": 0.6,
   "gm": 8978.1371,
   "meanRadius": 2574.76,
   "density": 1.8814
  },
  {
   "id": "iapetus",
   "code": 608,
   "parent": "saturn",
   "name": "Iapetus",
   "ephemeris": "SAT441",
   "frame": "laplace",
   "epoch": "2000-01-01.5",
   "a": 3561700.0,
   "e": 0.028,
   "w": 254.5,
   "M": 74.8,
   "i": 7.6,
   "node": 86.5,
   "P": 79.331002,
   "Pw": 1662.9,
   "Pnode": 3130.302,
   "poleRA": 288.7,
   "poleDec": 78.9,
   "tilt": 14.8,
   "gm": 120.51511,
   "meanRadius": 734.3,
   "density": 1.0887
  },
  {
   "id": "ariel",
   "code": 701,
   "parent": "uranus",
   "name": "Ariel",
   "ephemeris": "URA182",
   "frame": "equatorial",
   "epoch": "2000-01-01.5",
   "a": 190929.0,
   "e": 0.001,
   "w": 9.6,
   "M": 193.5,
   "i": 0.0,
   "node": 0.0,
   "P": 2.520379,
   "Pw": 28.901,
   "Pnode": 0.0,
   "poleRA": null,
   "poleDec": null,
   "tilt": null,
   "gm": 83.5,
   "meanRadius": 578.9,
   "density": 1.539
  },
  {
   "id": "umbriel",
   "code": 702,
   "parent": "uranus",
   "name": "Umbriel",
   "ephemeris": "URA182",
   "frame": "equatorial",
   "epoch": "2000-01-01.5",
   "a": 265986.0,
   "e": 0.004,
   "w": 183.4,
   "M": 253.0,
   "i": 0.1,
   "node": 174.8,
   "P": 4.144177,
   "Pw": 64.126,
   "Pnode": 129.945,
   "poleRA": null,
   "poleDec": null,
   "tilt": null,
   "gm": 85.1,
   "meanRadius": 584.7,
   "density": 1.523
  },
  {
   "id": "titania",
   "code": 703,
   "parent": "uranus",
   "name": "Titania",
   "ephemeris": "URA182",
   "frame": "equatorial",
   "epoch": "2000-01-01.5",
   "a": 436298.0,
   "e": 0.002,
   "w": 184.0,
   "M": 68.1,
   "i": 0.1,
   "node": 29.5,
   "P": 8.705869,
   "Pw": 579.928,
   "Pnode": 1644.649,
   "poleRA": null,
   "poleDec": null,
   "tilt": null,
   "gm": 226.9,
   "meanRadius": 788.9,
   "density": 1.653
  },
  {
   "id": "oberon",
   "code": 704,
   "parent": "uranus",
   "name": "Oberon",
   "ephemeris": "URA182",
   "frame": "equatorial",
   "epoch": "2000-01-01.5",
   "a": 583511.0,
   "e": 0.002,
   "w": 132.2,
   "M": 143.6,
   "i": 0.1,
   "node": 76.8,
   "P": 13.463237,
   "Pw": 158.604,
   "Pnode": 192.798,
   "poleRA": null,
   "poleDec": null,
   "tilt": null,
   "gm": 205.3,
   "meanRadius": 761.4,
   "density": 1.664
  },
  {
   "id": "miranda",
   "code": 705,
   "parent": "uranus",
   "name": "Miranda",
   "ephemeris": "URA182",
   "frame": "equatorial",
   "epoch": "2000-01-01.5",
   "a": 129846.0,
   "e": 0.001,
   "w": 154.8,
   "M": 73.0,
   "i": 4.4,
   "node": 100.9,
   "P": 1.413479,
   "Pw": 8.939,
   "Pnode": 17.787,
   "poleRA": null,
   "poleDec": null,
   "tilt": null,
   "gm": 4.3,
   "meanRadius": 235.8,
   "density": 1.178
  },
  {
   "id": "triton",
   "code": 801,
   "parent": "neptune",
   "name": "Triton",
   "ephemeris": "NEP098",
   "frame": "equatorial",
   "epoch": "2000-01-01.5",
   "a": 354800.0,
   "e": 0.0,
   "w": 0.0,
   "M": 63.0,
   "i": 157.3,
   "node": 177.7,
   "P": 5.8792,
   "Pw": 675.2,
   "Pnode": 299.4,
   "poleRA": null,
   "poleDec": null,
   "tilt": null,
   "gm": 1428.49546,
   "meanRadius": 1352.6,
   "density": 2.0649
  },
  {
   "id": "charon",
   "code": 901,
   "parent": "pluto",
   "name": "Charon",
   "ephemeris": "PLU060",
   "frame": "equatorial",
   "epoch": "2000-01-01.5",
   "a": 19600.0,
   "e": 0.0,
   "w": 0.0,
   "M": 304.1,
   "i": 0.0,
   "node": 0.0,
   "P": 6.387222,
   "Pw": null,
   "Pnode": null,
   "poleRA": null,
   "poleDec": null,
   "tilt": null,
   "gm": 106.1,
   "meanRadius": 606.0,
   "density": 1.853
  }
 ],
 "moonFact": {
  "rotHours": 655.7,
  "dayHours": 708.7,
  "orbVelocity": 1.0,
  "obliquity": 6.7,
  "meanTempC": -20.0,
  "pressureBar": 0.0,
  "moons": 0.0
 },
 "planetGM": {
  "earth": 398600.436,
  "mars": 42828.37362,
  "jupiter": 126686531.9,
  "saturn": 37931206.23,
  "uranus": 5793951.3,
  "neptune": 6835099.97,
  "pluto": 869.3
 },
 "dwarfs": [
  {
   "id": "pluto",
   "fullname": "134340 Pluto (1930 BM)",
   "epochJD": 2457588.5,
   "a": 39.58862938517124,
   "e": 0.2518378778576892,
   "i": 17.14771140999114,
   "node": 110.2923840543057,
   "w": 113.7090015158565,
   "M": 38.68366347318184,
   "n": 0.003956838955553025,
   "phys": {
    "eqRadius": 1188.3,
    "meanRadius": 1188.3,
    "mass": 0.013024599999999999,
    "density": 1.853,
    "rotPeriodDays": -6.3872,
    "orbPeriodYears": 247.92065,
    "albedo": 0.3,
    "gravity": 0.62,
    "escapeV": 1.21
   }
  },
  {
   "id": "ceres",
   "fullname": "1 Ceres (A801 AA)",
   "epochJD": 2461200.5,
   "a": 2.765552595034094,
   "e": 0.07969229514816586,
   "i": 10.58802780183462,
   "node": 80.24862682043221,
   "w": 73.29421453021587,
   "M": 274.4193463761342,
   "n": 0.21430445064843,
   "phys": {
    "eqRadius": 482.1,
    "meanRadius": 469.7,
    "mass": 0.000938416,
    "density": 2.162,
    "rotPeriodDays": 0.37809042,
    "orbPeriodYears": 4.61,
    "albedo": 0.09,
    "gravity": 0.27,
    "escapeV": 0.51
   }
  },
  {
   "id": "eris",
   "fullname": "136199 Eris (2003 UB313)",
   "epochJD": 2461200.5,
   "a": 67.93394687853566,
   "e": 0.4382385347971672,
   "i": 43.9258279471791,
   "node": 36.00477044417249,
   "w": 150.7949235840312,
   "M": 211.774434275007,
   "n": 0.001760247770619088,
   "phys": {
    "eqRadius": 1200.0,
    "meanRadius": 1200.0,
    "mass": 0.0166,
    "density": 2.3,
    "rotPeriodDays": 1.079,
    "orbPeriodYears": 557.56,
    "albedo": 0.84,
    "gravity": 0.77,
    "escapeV": 1.36
   }
  },
  {
   "id": "haumea",
   "fullname": "136108 Haumea (2003 EL61)",
   "epochJD": 2461200.5,
   "a": 43.06029023650952,
   "e": 0.1944430148898797,
   "i": 28.20847393040364,
   "node": 121.7860561329425,
   "w": 240.6905472508661,
   "M": 223.2104118812299,
   "n": 0.003488097731816818,
   "phys": {
    "eqRadius": 870.0,
    "meanRadius": 715.0,
    "mass": 0.004006,
    "density": 2.6,
    "rotPeriodDays": 0.1631,
    "orbPeriodYears": 284.81,
    "albedo": 0.72,
    "gravity": 0.35,
    "escapeV": 0.78
   }
  },
  {
   "id": "makemake",
   "fullname": "136472 Makemake (2005 FY9)",
   "epochJD": 2461200.5,
   "a": 45.57093317300052,
   "e": 0.1588889953992523,
   "i": 29.02785603743067,
   "node": 79.2948338209406,
   "w": 297.0922733397207,
   "M": 169.9379962048232,
   "n": 0.003203850120050116,
   "phys": {
    "eqRadius": 717.0,
    "meanRadius": 714.0,
    "mass": 0.0031,
    "density": 2.1,
    "rotPeriodDays": 0.937,
    "orbPeriodYears": 307.54,
    "albedo": 0.81,
    "gravity": 0.4,
    "escapeV": 0.76
   }
  }
 ],
 "plutoPole": {
  "ra": [
   132.99,
   0.0
  ],
  "dec": [
   -6.16,
   0.0
  ]
 },
 "plutoFact": {
  "rotHours": -153.3,
  "dayHours": 153.3,
  "orbVelocity": 4.7,
  "obliquity": 119.5,
  "meanTempC": -225.0,
  "pressureBar": 1e-05,
  "moons": 5.0
 },
 "saturnRings": {
  "dIn": 66900.0,
  "cIn": 74658.0,
  "bIn": 91975.0,
  "bOut": 117507.0,
  "aIn": 122340.0,
  "encke": 133410.0,
  "keeler": 136487.0,
  "aOut": 136780.0,
  "f": 139826.0
 },
 "rotation": {
  "sun": {
   "ra": [
    286.13,
    0.0
   ],
   "dec": [
    63.87,
    0.0
   ],
   "pm": [
    84.176,
    14.1844
   ]
  },
  "mercury": {
   "ra": [
    281.0103,
    -0.0328
   ],
   "dec": [
    61.4155,
    -0.0049
   ],
   "pm": [
    329.5988,
    6.1385108
   ]
  },
  "venus": {
   "ra": [
    272.76,
    0.0
   ],
   "dec": [
    67.16,
    0.0
   ],
   "pm": [
    160.2,
    -1.4813688
   ]
  },
  "earth": {
   "ra": [
    0.0,
    -0.641
   ],
   "dec": [
    90.0,
    -0.557
   ],
   "pm": [
    190.147,
    360.9856235
   ]
  },
  "mars": {
   "ra": [
    317.269202,
    -0.10927547
   ],
   "dec": [
    54.432516,
    -0.05827105
   ],
   "pm": [
    176.049863,
    350.891982443297
   ],
   "extra": {
    "ra": {
     "amp": 0.419057,
     "angle": [
      79.398797,
      0.5042615
     ]
    },
    "dec": {
     "amp": 1.591274,
     "angle": [
      166.325722,
      0.5042615
     ]
    },
    "pm": {
     "amp": 0.584542,
     "angle": [
      95.391654,
      0.5042615
     ]
    }
   }
  },
  "jupiter": {
   "ra": [
    268.056595,
    -0.006499
   ],
   "dec": [
    64.495303,
    0.002413
   ],
   "pm": [
    284.95,
    870.536
   ]
  },
  "saturn": {
   "ra": [
    40.589,
    -0.036
   ],
   "dec": [
    83.537,
    -0.004
   ],
   "pm": [
    38.9,
    810.7939024
   ]
  },
  "uranus": {
   "ra": [
    257.311,
    0.0
   ],
   "dec": [
    -15.175,
    0.0
   ],
   "pm": [
    203.81,
    -501.1600928
   ]
  },
  "neptune": {
   "ra": [
    299.36,
    0.0
   ],
   "dec": [
    43.46,
    0.0
   ],
   "pm": [
    249.978,
    541.1397757
   ]
  },
  "pluto": {
   "ra": [
    132.993,
    0.0
   ],
   "dec": [
    -6.163,
    0.0
   ],
   "pm": [
    302.695,
    56.3625225
   ]
  }
 }
};
