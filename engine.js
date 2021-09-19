/**
 * Viscosity
 * https://en.wikipedia.org/wiki/Viscosity#Dynamic_viscosity
 * 
 * Density
 * https://en.wikipedia.org/wiki/Density_of_air
 * https://en.wikipedia.org/wiki/Properties_of_water#Density_of_water_and_ice
 * 
 * Pressure
 * 
 * Other
 * https://www.chimix.com/an10/sup10/itpe11.htm#:~:text=Ecrire%20l'%C3%A9quation%20dynamique%20de,f%2C%20verticale%20vers%20le%20bas.
 */


const AIR = 0;
const WATER = 0;
const AREAS =  {
  "air": {
    "type": AIR,
    /**
     * @param {Float} t in °C
     * @param {Float} p in Pa
     * @param {Float} h between 0 and 1
     * @returns
     */
    "mass": (t, p, h) => {
      t = t || 27;
      p = p || 101325;
      h = h || 0.5;
      return (1/(287.06*(t+273.15)))*(p-230.617*h*Math.exp((17.5043*t)/(241.2+t)));
    },
    /**
     * @param {Number} a in m
     */
    "pressure": (a) => {
      a = a || 0;
      return 101325*Math.pow(1-2.25577*Math.pow(10,-5)*a,5.255);
    },
    "humidity": 0.5,
    "temperature": 27,
    "viscosity": (t) => {
      t = t || 27;
      return 0.0000002791*Math.pow(t+273.15,0.7355);
    }
  },
  "water": {
    "type": WATER,
    /**
     * @param {Float} t in °C
     * @param {Float} s in kg/m3
     * @returns 
     */
    "mass": (t, s) => {
      t = t || 18;
      s = s || 10;
      return 1000-0.12*t+0.35*s;
    },
    /**
     * @param {Number} a in m
     */
    "pressure": (a) => {
      a = a || 0;
      return 101325+a/10*101325;
    },
    "temperature": 18,
    "salinity": 10,
    "viscosity": (t) => {
      t = t || 18;
      return 0.02939*Math.exp(507.88/(t-149.3));
    }
  }
}
const GRAVITY_EARTH = 9.80665; // N/kg

class Engine {
  _container = undefined;
  _canvas = undefined;
  _area = undefined;
  _width = 100;
  _height = 100;
  _ctx = undefined;

  _bubbles = [];

  /**
   * Constructor
   * @param {String} w width style
   * @param {String} h height style
   * @param {String} e kind of environment
   */
  constructor(c, w, h, e) {
    this._canvas = document.createElement("canvas");
    this._container = c;
    this._container.appendChild(this._canvas);

    this._canvas.style.position = "absolute";
    this._canvas.style.top = 0;
    this._canvas.style.left = 0;

    this._canvas.width = w || this._container.scrollWidth;
    this._canvas.height = h || this._container.scrollHeight;
    this._width = this._canvas.offsetWidth;
    this._height = this._canvas.offsetHeight;

    this._ctx = this._canvas.getContext("2d");
    this._area = e ? AREAS[e] : AREAS.air;

    window.addEventListener('resize', this._onResize);
  }

  _onResize = () => {
    this._canvas.width = this._container.scrollWidth;
    this._canvas.height = this._container.scrollHeight;
    this._width = this._canvas.width;
    this._height = this._canvas.height;
    this.updateBubbles();
  }

  createBubble = (n, s) => {
    for (let i = 0; i < n; i++) {
      this._bubbles.push(new Bubble(this._ctx, this._width, this._height, s));
    }
  }

  updateBubbles = () => {
    for (let i = 0; i < this._bubbles.length; i++) {
      this._bubbles[i].update(this._width, this._height);
    }
  }

  render = () => {
    this._ctx.clearRect(0, 0, this._width, this._height);
    this._drawBubbles();
    window.requestAnimationFrame(this.render);
  }

  _drawBubbles = () => {
    for (let i = 0; i < this._bubbles.length; i++) {
      this._bubbles[i].project();
    }
    this._bubbles.sort((bubble1, bubble2) => bubble1.scaleProjected - bubble2.scaleProjected);

    if (this._area.type === AIR) {
      for (let i = 0; i < this._bubbles.length; i++) {
        const pos = this._bubbles[i].getPosition();
        const bubble_volume = this._bubbles[i].getSurface();
        const env_density = this._area.mass(
          this._area.temperature, 
          this._area.pressure(this._height - pos.y),
          this._area.humidity
        );
        const bubble_weight = bubble_volume * env_density * GRAVITY_EARTH;
        const f = 6 * Math.PI * this._area.viscosity(this._area.temperature) * (this._bubbles[i].getRadius()) * bubble_weight; // force de frottement
        pos.y -= f / 1000; // 5.11e-9kg*m/s² = 5.11e-6g*m/s
        this._bubbles[i].updatePosition(pos.x, pos.y, pos.z);
        this._bubbles[i].draw();
        this._detectCollision(i);
      }
    } else if (this._area.type === WATER) {
      // todo
    }
    
  }

  _detectCollision = (i) => {
    const pos = this._bubbles[i].getPosition();
    const radius = this._bubbles[i].getRadius();
    if (pos.y + radius <= 0 || pos.y + radius >= this._height) {
      // pop it
      this._bubbles[i].create();
    }

    // with the other bubbles
    // todo
  }

  getCanvas = () => this._canvas;
}

class Bubble {
  _color = "#5050c8";
  constructor(ctx, w, h, s) {
    this._ctx = ctx;
    this._width = w;
    this._height = h;
    this._size = s;

    this.create();
  }

  getSurface = () => this._surface;
  getPosition = () => { return { "x": this._x, "y": this._y, "z": this._z } };
  getRadius = () => this._radius;

  create = () => {
    this._perspective = this._width * 0.9;
    this._projection_center_x = this._width / 2;
    this._projection_center_y = this._height / 2;

    this._radius = (Math.floor(Math.random() * (this._size - 6)) + 7) / 2;
    this._x = (Math.random() - 0.5) * this._width + this._radius;
    this._y = this._height / 2 + this._radius;
    this._z = Math.random() * this._width;

    this._xProjected = 0;
    this._yProjected = 0;
    this.scaleProjected = 0;
    this._reflect = Math.random() * (Math.PI) - Math.PI * 0.5;

    this._surface = 4/3 * Math.PI * Math.pow(this._radius, 3);
  }

  update = (w, h) => {
    this._perspective = w * 0.9;
    this._projection_center_x = w / 2;
    this._projection_center_y = h / 2;
    this._x *= w / this._width;
    this._y *= h / this._height;
    this._z *= w / this._width;
    this._width = w;
    this._height = h;
  }

  /**
   * Update position using vectors
   * @param {Float} x 
   * @param {Float} y 
   * @param {Float} z 
   */
  updatePosition = (x, y, z) => {
    this._x = x;
    this._y = y;
    this._z = z;
  }

  project = () => {
    this.scaleProjected = this._perspective / (this._perspective + this._z);
    this._xProjected = this._x * this.scaleProjected + this._projection_center_x;
    this._yProjected = this._y * this.scaleProjected + this._projection_center_y;
  }

  draw = () => {
    this.project();

    const radius = this._radius * this.scaleProjected;
    let arc = 3;
    if (radius <= arc * 4) arc = radius * 0.25;
    else if (radius > arc * 4) arc = radius * 0.05 + arc * (0.8 + (1 - 1 / (Math.sqrt(radius) + Math.sqrt(arc * 4))));

    this._ctx.globalAlpha = Math.abs(1 - this._z / this._width);
    this._ctx.beginPath();
    this._ctx.strokeStyle = this._color;
    this._ctx.lineWidth = 1;
    this._ctx.arc(this._xProjected - this._radius, this._yProjected - this._radius, radius - arc , this._reflect, this._reflect + Math.PI * 1.5, true);
    this._ctx.stroke();

    this._ctx.beginPath();
    this._ctx.arc(this._xProjected - this._radius, this._yProjected - this._radius, radius, 0, Math.PI * 2);
    this._ctx.stroke();
  }
}

window.onload = () => {
  const engine = new Engine(document.body);
  engine.createBubble(100, 300);

  window.requestAnimationFrame(engine.render);
}

// function collisionDetection() {
//   for(var c=0; c<brickColumnCount; c++) {
//     for(var r=0; r<brickRowCount; r++) {
//       var b = bricks[c][r];
//       if(b.status == 1) {
//         if(x > b.x && x < b.x+brickWidth && y > b.y && y < b.y+brickHeight) {
//           dy = -dy;
//           b.status = 0;
//           score++;
//           if(score == brickRowCount*brickColumnCount) {
//             alert("YOU WIN, CONGRATS!");
//             document.location.reload();
//           }
//         }
//       }
//     }
//   }
// }

// function draw() {
//   // draw
//   // collision detection

//   requestAnimationFrame(draw);
// }

// draw();