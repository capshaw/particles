/**
 * Configurations for the display of the canvas and particles upon that canvas
 */
class DisplaySettings {
    framesPerSecond = 30;
    canvasBackgroundColor = '#eee';
    canvasId;
    canvasWidth;
    canvasHeight;
    particleStrokeColor = '#000';
    particleSize = 3;

    constructor() {}

    setFramesPerSecond(framesPerSecond) {
        this.framesPerSecond = framesPerSecond;
        return this;
    }

    setCanvasBackgroundColor(canvasBackgroundColor) {
        this.canvasBackgroundColor = canvasBackgroundColor;
        return this;
    }

    setCanvasId(canvasId) {
        this.canvasId = canvasId;
        return this;
    }

    setCanvasWidth(canvasWidth) {
        this.canvasWidth = canvasWidth;
        return this;
    }

    setCanvasHeight(canvasHeight) {
        this.canvasHeight = canvasHeight;
        return this;
    }

    setParticleStrokeColor(particleStrokeColor) {
        this.particleStrokeColor = particleStrokeColor;
        return this;
    }

    setParticleSize(particleSize) {
        this.particleSize = particleSize;
        return this;
    }
}

/**
 * Configuration for the simulation fundamentals
 */
class SimulationSettings {
    particleCount;
    environmentWidth;
    environmentHeight;

    constructor() {}

    setParticleCount(particleCount) {
        this.particleCount = particleCount;
        return this;
    }

    setEnvironmentWidth(environmentWidth) {
        this.environmentWidth = environmentWidth;
        return this;
    }

    setEnvironmentHeight(environmentHeight) {
        this.environmentHeight = environmentHeight;
        return this;
    }

    setParticleSettings(particleSettings) {
        this.particleSettings = particleSettings
        return this;
    }
}

/**
 * Configuration for the fundamental properties of the particles
 */
class ParticleSettings {
    colors;
    drag;
    mass;
    pressureInflectionPoint;
    sight;

    constructor() {}

    setColors(colors) {
        this.colors = colors;
        return this;
    }

    setDrag(drag) {
        this.drag = drag;
        return this;
    }

    setMass(mass) {
        this.mass = mass;
        return this;
    }

    setPressureInflectionPoint(pressureInflectionPoint) {
        this.pressureInflectionPoint = pressureInflectionPoint;
        return this;
    }

    setSight(sight) {
        this.sight = sight;
        return this;
    }
}

/**
 * Represents a velocity on a 2D grid. Could also implement using angle and magnitude but for now
 * this is more convenient.
 */
class Velocity2D {
    x;
    y;

    constructor (x, y) {
        this.x = x;
        this.y = y;
    }
}

/**
 * Represents a position on a 2D grid
 */
class Position2D {
    x;
    y;

    constructor (x, y) {
        this.x = x;
        this.y = y;
    }
}

/**
 * A particle in the simulation
 */
class Particle {
    color;
    mass;
    velocity;
    position;

    constructor(color, mass, position, velocity) {
        this.color = color;
        this.mass = mass;
        this.position = position;
        this.velocity = velocity;
    }
}

/**
 * Handles the display of the simulation
 */
class CanvasHandler {
    context;
    canvas;
    displaySettings;

    constructor(displaySettings) {
        this.displaySettings = displaySettings;
        this.canvas = document.getElementById(this.displaySettings.canvasId);
        if (this.displaySettings.canvasWidth) {
            this.canvas.width = this.displaySettings.canvasWidth;
        }
        if (this.displaySettings.canvasHeight) {
            this.canvas.height = this.displaySettings.canvasHeight;
        }
        this.context = this.canvas.getContext('2d');
    }

    /**
     * Given a particle, display that particle on the context given as a circle
     */
    _drawCircle(particle) {
        this.context.beginPath();
        this.context.arc(
            particle.position.x,
            particle.position.y,
            this.displaySettings.particleSize,
            0,
            2 * Math.PI,
            false
        );
        this.context.fillStyle = particle.color;
        this.context.strokeStyle = this.displaySettings.particleStrokeColor;
        this.context.fill();
        this.context.stroke();
    }

    /**
     * Reset the canvas to a blank slate
     */
    _resetCanvas() {
        this.context.fillStyle = this.displaySettings.canvasBackgroundColor;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * The primary public functionality of this class. Given a list of particles, display the
     * particles on the canvas in a meaningful way.
     */
    drawState(particles) {
        this._resetCanvas();

        for (const key in particles) {
            this._drawCircle(particles[key]);
        }
    }
}

/**
 * Handles the underlying calculations of the simulation
 */
class SimulationHandler {
    simulationSettings;
    particles;
    particleAttractions; // TODO: make attractions customizable in a future version of this.

    constructor(simulationSettings) {
        this.simulationSettings = simulationSettings;
        this.particles = [];
        this.particleAttractions = {};
    }

    /**
     * Build an initial state of particles in the environment. Currently this puts all particles
     * somewhere in the middle 50x50 grid of the environment. This will currently lead to unexpected
     * behavior for smaller environments.
     */
    setupParticlesInitialState() {
        const numColors = this.simulationSettings.particleSettings.colors.length;
        for (var i = 0; i < this.simulationSettings.particleCount; i++) {
            const colorIndex = Math.floor(Math.random() * (numColors - 1)) + 1;
            const particle = new Particle(
                this.simulationSettings.particleSettings.colors[colorIndex],
                this.simulationSettings.particleSettings.mass,
                new Position2D(
                    Math.random() * 50 + this.simulationSettings.environmentWidth / 2 - 25,
                    Math.random() * 50 + this.simulationSettings.environmentHeight / 2 - 25
                ),
                new Velocity2D(0, 0)
            );
            this.particles.push(particle);
        }
    }

    /**
     * Build a 2D matrix of particle attractions from each particle color to each particle color
     */
    setupParticleAttractions() {
        for (var fromColorId in this.simulationSettings.particleSettings.colors) {
            const fromColorString = this.simulationSettings.particleSettings.colors[fromColorId];
            this.particleAttractions[fromColorString] = {}
            for (var toColorId in this.simulationSettings.particleSettings.colors) {
                const toColorString = this.simulationSettings.particleSettings.colors[toColorId];
                if (fromColorId == toColorId) {
                    this.particleAttractions[fromColorString][toColorString] = 1;
                    continue;
                }
                this.particleAttractions[fromColorString][toColorString] = (Math.random() * 2) - 1.5;
            }
        }
    }

    /**
     * A slightly odd and hacky attraction method that mixes gravitational attraction with some
     * artificial pressure-like functionality.
     *
     * The method takes a pair of masses, their attraction multiplier (how much particle A prefers to
     * move towards particle B) and their distance and computes and output accelerant.
     *
     * The output of this shifts to almost neutral within an inflection point ± 50% and to a
     * negative multiple of the gravitational force when smaller.
     *
     * Ultimately the goal is to keep particles not too close and not too far from one another.
     *
     * This was hacked together and should be experimented with in future iterations.
     *
     * This is partially loosely based on gravitational functions taken from—
     * https://medium.com/@cmilhench/gravity-javascript-universe-505f9a5e4a85
     */
    _getParticleAttraction(distance, attractionMultiplier, massA, massB) {
        // This negative multiplier is concerning. It suggests a bug somewhere else in this simulation.
        const gravity = attractionMultiplier * (massA * massB / Math.pow(distance, 1)) * -1;
        const repulsiveForce = (-1.3 * gravity) + gravity;
        // A bit of a hack — because various forces can cancel out, only allow equilibrium if the two
        // particles are actually attracted to one another.
        const inflectionPoint = this.simulationSettings.particleSettings.pressureInflectionPoint;
        const inflectionPointMin = inflectionPoint - inflectionPoint * 0.5;
        const inflectionPointMax = inflectionPoint + inflectionPoint * 0.5
        if (attractionMultiplier > 0 && distance > inflectionPointMin && distance < inflectionPointMax) {
            // Was previously -0.01
            return 0;
        }
        if (distance > inflectionPoint) {
            return gravity;
        }
        return repulsiveForce;
    }

    /**
     * Advance the simulation in two parts—
     *
     * (1) Calculate net velocity change to the particle due to nearby particles
     * (2) Advance the particles to their new location based on their net velocity
     */
    advanceSimulation() {
        /**
         * Calculate velocity change for each particle on the board
         */
        for (const fromParticleId in this.particles) {
            for (const toParticleId in this.particles) {
                if (fromParticleId == toParticleId) {
                    continue;
                }

                const fromParticle = this.particles[fromParticleId];
                const toParticle = this.particles[toParticleId];
                const distance = Math.sqrt(
                    Math.pow(Math.abs(fromParticle.position.x - toParticle.position.x), 2) +
                    Math.pow(Math.abs(fromParticle.position.y - toParticle.position.y), 2)
                )

                if (distance > this.simulationSettings.particleSettings.sight) {
                    continue;
                }

                const calculatedAttraction = this._getParticleAttraction(
                    distance,
                    this.particleAttractions[fromParticle.color][toParticle.color],
                    fromParticle.mass,
                    toParticle.mass
                );
                var direction = Math.atan2(
                    fromParticle.position.x - toParticle.position.x,
                    fromParticle.position.y - toParticle.position.y
                );
                var attractionX = Math.sin(direction) * calculatedAttraction;
                var attractionY = Math.cos(direction) * calculatedAttraction;
                fromParticle.velocity.x += attractionX;
                fromParticle.velocity.y += attractionY;
            }
        }

        /**
         * Move the particles, keeping them within the confines of the canvas
         */
        for (const particleId in this.particles) {
            const particle = this.particles[particleId];
            particle.position.x += particle.velocity.x;
            particle.position.y += particle.velocity.y;

            particle.velocity.x *= this.simulationSettings.particleSettings.drag;
            particle.velocity.y *= this.simulationSettings.particleSettings.drag;

            if (particle.position.x <= 0) {
                particle.velocity.x *= -1
                particle.position.x = 0 + -1 * particle.position.x;
            }
            if (particle.position.y <= 0) {
                particle.velocity.y *= -1
                particle.position.y = 0 + -1 * particle.position.y;
            }
            if (particle.position.x >= this.simulationSettings.environmentWidth) {
                particle.velocity.x *= -1
                particle.position.x = this.simulationSettings.environmentWidth -
                    (particle.position.x - this.simulationSettings.environmentWidth);
            }
            if (particle.position.y >= this.simulationSettings.environmentHeight) {
                particle.velocity.y *= -1
                particle.position.y = this.simulationSettings.environmentHeight -
                    (particle.position.y - this.simulationSettings.environmentHeight);
            }
        }
    }
}

/**
 * The main entry-point for users of this simulation. A user should build their settings objects,
 * instantiate the simulation, and start it!
 */
class ParticleSimulation {
    canvasHandler;
    simulationHandler;
    globalID;

    constructor(displaySettings, simulationSettings) {
        this.canvasHandler = new CanvasHandler(displaySettings);
        this.simulationHandler = new SimulationHandler(simulationSettings);
    }

    start() {
        this.simulationHandler.setupParticleAttractions();
        this.simulationHandler.setupParticlesInitialState();
        this.nextFrame();
    }

    nextFrame() {
        setTimeout(() => {
            this.simulationHandler.advanceSimulation();
            this.globalID = requestAnimationFrame(() => {
                this.canvasHandler.drawState(this.simulationHandler.particles);
            });
            this.nextFrame();
        }, 1000 / this.canvasHandler.displaySettings.framesPerSecond);
    }
}