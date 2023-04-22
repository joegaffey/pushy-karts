const levels = [
  {
    maxCars: 4,
    difficulty: 'Easy',
    boxes: {
      width: 4,
      height: 6,
      position: {x: 0, y: 0, z: 0},
    },
    cars: {
      maxNum: 4,
      position: {x: 0, y: 0, z: -16},
    },  
    platform: {
      position: {x: 0, y: -0.5, z: 0},
      size: {x: 50, y: 1, z: 50},      
      walls: [
        {
          position: {x: 0, y: 0, z: 50.5},
          size: {x: 50, y: 2, z: 1},      
        },
        {
          position: {x: 0, y: 0, z: -25.5},
          size: {x: 50, y: 2, z: 1},      
        },
        {
          position: {x: -25.5, y: 0, z: 12.5},
          size: {x: 1, y: 2, z: 77},      
        },
        {
          position: {x: 25.5, y: 0, z: 12.5},
          size: {x: 1, y: 2, z: 77},      
        }
      ]
    }
  },
  {
    maxCars: 4,
    difficulty: 'Easy',
    boxes: {
      width: 8,
      height: 6,
      position: {x: 0, y: 0, z: 10},
    },
    cars: {
      maxNum: 4,
      position: {x: 0, y: 0, z: -16},
    },  
    platform: {
      position: {x: 0, y: -0.5, z: 0},
      size: {x: 50, y: 1, z: 50},      
      walls: [
        {
          position: {x: 0, y: 0, z: 50.5},
          size: {x: 50, y: 2, z: 1},      
        },
        {
          position: {x: 0, y: 0, z: -25.5},
          size: {x: 50, y: 2, z: 1},      
        },
        {
          position: {x: -25.5, y: 0, z: 12.5},
          size: {x: 1, y: 2, z: 77},      
        },
        {
          position: {x: 25.5, y: 0, z: 12.5},
          size: {x: 1, y: 2, z: 77},      
        }
      ],
      ramps: [
        {
          position: {x: 0, y: 0.5, z: 0},
        },
      ]      
    }
  },
  {
    maxCars: 4,
    difficulty: 'Medium',
    boxes: {
      width: 8,
      height: 6,
      position: {x: 0, y: 0, z: 0},
    },
    cars: {
      maxNum: 4,
      position: {x: 0, y: 0, z: -16},
    },  
    platform: {
      position: {x: 0, y: -0.5, z: 0},
      size: {x: 50, y: 1, z: 50},      
    }
  },
  {
    maxCars: 4,
    difficulty: 'Hard',
    boxes: {
      width: 8,
      height: 6,
      position: {x: 0, y: 0, z: 10},
    },
    cars: {
      maxNum: 4,
      position: {x: 0, y: 0, z: -16},
    },  
    platform: {
      position: {x: 0, y: -0.5, z: 0},
      size: {x: 50, y: 1, z: 50},
      ramps: [
        {
          position: {x: 0, y: 0.5, z: 0},
        },
      ]
    }
  },
];

export default levels;