const AIR_MOLAR_MASS = 0.02896; // kg/mol
const WATER_MOLAR_MASS = 0.01801; // kg/mol
const GRAVITY_EARTH = 9.80665; // m.s-2
const ATMOSPHERIC_PRESSURE = 101325; // Pa
const IDEAL_GAS = 8.3144; // J.K-1.mol-1
const KELVIN = 273.15; 

const AIR = 0;
const WATER = 1;
const AREAS =  {
  "air": {
    "type": AIR,
    /**
     * @param {Float} t in °C
     * @param {Float} p in Pa
     * @returns
     */
    "density": (t, p) => {
      t = t || 27;
      p = p || ATMOSPHERIC_PRESSURE;
      return (p*AIR_MOLAR_MASS) / (IDEAL_GAS*(t + KELVIN))
    },
    /**
     * @param {Number} a in m
     */
    "pressure": (a) => {
      a = a || 0;
      return ATMOSPHERIC_PRESSURE*Math.pow(1-2.25577*Math.pow(10,-5)*a,5.255);
    },
    "temperature": 27
  },
  "water": {
    "type": WATER,
    /**
     * @param {Float} t in °C
     * @param {Float} s in kg/m3
     * @returns 
     */
    "density": (t, s) => {
      t = t || 18;
      s = s || 10;
      return 1000-0.12*t+0.35*s;
    },
    "temperature": 18,
    "salinity": 10,
  }
}

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

    this._canvas.style.position = "relative";
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
      if (this._area.type === AIR) this._bubbles[i].setColor("#ff0000");
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

    for (let i = 0; i < this._bubbles.length; i++) {
      const pos = this._bubbles[i].getPosition();
      const bubble_volume = this._bubbles[i].getSurface();
      
      const bubble_density = AREAS.air.density() * 0.999 + AREAS.water.density() * 0.001;
      const g_force = bubble_density * bubble_volume * GRAVITY_EARTH;

      const area_density = this._area.density();
      const p_force = area_density * bubble_volume * GRAVITY_EARTH;

      pos.y += convertMeterToPixel(g_force - p_force) / 1000;

      // frottement = -6pi*r*v

      this._bubbles[i].updatePosition(pos.x, pos.y, pos.z);
      this._bubbles[i].draw();
      this._detectCollision(i);
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
  setColor = (c) => this._color = c;

  create = () => {
    this._perspective = this._width * 1;
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

    this._surface = 4/3 * Math.PI * Math.pow(convertPixelToMeter(this._radius), 3);
  }

  update = (w, h) => {
    this._perspective = w * 1;
    this._projection_center_x = w / 2;
    this._projection_center_y = h / 2;
    this._x *= w / this._width;
    this._y *= h / this._height;
    this._z *= w / this._width;
    this._width = w;
    this._height = h;
  }

  /**
   * Update position
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

function convertPixelToMeter(p) {
  return p / 3779.52755906;
}

function convertMeterToPixel(m) {
  return m * 3779.52755906;
}

function render(callback) {
  callback();
  window.requestAnimationFrame(() => render(callback))
}

window.onload = () => {
  const air_engine = new Engine(document.getElementById("air"), undefined, undefined, "air");
  air_engine.createBubble(20, 300);

  const water_engine = new Engine(document.getElementById("water"), undefined, undefined, "water");
  water_engine.createBubble(20, 300);

  window.requestAnimationFrame(() => {
    render(() => {
      air_engine.render();
      water_engine.render();
    });
  });
}