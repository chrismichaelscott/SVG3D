/**
 * 
 * The "SVG3D" object acts as a factory for returning a scene
 * 
 */
window['SVG3D'] = function(frame, cameraPosition, lensZero, lensXAxis, LensYAxis, accuracy) {
	var svg = "http://www.w3.org/2000/svg";
	
	/**
	 * 
	 * This class describes a scene and is returned from the factory method (its parent scope)
	 * 
	 */
	var SVG3DScene = function(canvas) {
		var scene = this;
		
		this.canvas = canvas;
		
		this.camera = {
			origin: [],
			lensZero: null,
			lensXAxis: null,
			lensYAxis: null,
			lensCenter: null,
			lensWidth: 0,
			lensHeight: 0
		};
		
		Object.defineProperty(this.camera, "lens", {
			set: function(value) {
				this.lensZero = value.zero;
				this.lensXAxis = value.xAxis;
				this.lensYAxis = value.yAxis;
				this.lensCenter = [
					(value.xAxis[0] + value.yAxis[0]) / 2,
					(value.xAxis[1] + value.yAxis[1]) / 2,
					(value.xAxis[2] + value.yAxis[2]) / 2
				];
				this.lensWidth = mod([value.xAxis[0] - value.zero[0], value.xAxis[1] - value.zero[1], value.xAxis[2] - value.zero[2]]);
				this.lensHeight = mod([value.yAxis[0] - value.zero[0], value.yAxis[1] - value.zero[1], value.yAxis[2] - value.zero[2]]);
			}
		});
		
		this.objects = [];
		
		this.draw = {
			point: function(point) {
				var obj = new Point(point);
				scene.objects.push(obj);
				return obj;
			},
			plane: function(a, b, c, d) {
				var obj = new Plane(a, b, c, d);
				scene.objects.push(obj);
				return obj;
			},
			cuboid: function(a, b, c, d) {
				var obj = new Cuboid(a, b, c, d);
				scene.objects.push(obj);
				return obj;
			}
		};
		
		this.render = function() {			
			for (var x in scene.objects) {
				scene.objects[x].render(scene.camera, scene.canvas);
			}
		};
		
		/**
		* 
		* Some tools for animating vectors
		* 
		*/
		this.animate = {
			rotateOnY: function(obj, centerOfRotation, degrees, time, repeat, frames) {
				var points = obj.getPoints();
				
				if (!centerOfRotation) {
					centerOfRotation = [0, 0, 0];
				}
				
				if (!degrees) {
					degrees = 2 * Math.PI;
				}
				
				if (!time) {
					time = 50;
				}
				
				if (!frames) {
					frames = time * 24;
				}
				var frame = 0;
				var pause = time / frames;
				
				function increment() {
					frame++;
					var rotation = degrees * frame / frames;
					var newPoints = [];
					
					for (var index in points) {
						var point = points[index];
						
						var relativePoint = vectorMinus(point, centerOfRotation);
						var rotatedPoint = vectorTransform(relativePoint, 
							[
								[	Math.cos(rotation),			0,			Math.sin(rotation)	],
								[	0,							1,			0					],
								[	-1 * Math.sin(rotation),	0,			Math.cos(rotation)	]
							]);
						newPoints[index] = vectorAdd(rotatedPoint, centerOfRotation);
					}
					
					obj.update.apply(obj, newPoints);
					obj.render(scene.camera, scene.canvas);
					
					if (frame < frames || repeat) {
						setTimeout(increment, pause);
					}
				}
				
				increment();
			}
		};
	};
	
	// *** START 3D Objects *** //
	
	var Point = function(point) {
		var position = point;
		var element = null;
		
		this.getPoints = function() {
			return [
				position
			];
		}
		
		this.update = function(point) {
			position = point;
		};
		
		this.render = function(camera, canvas) {
			var relativeCoordinates = projectPointOntoLens(position, camera);
			
			var screenX = relativeCoordinates[0] * canvas.offsetWidth;
			var screenY = relativeCoordinates[1] * canvas.offsetHeight;
			
			if (!element) {
				element = document.createElementNS(svg, "circle");
				element.setAttribute("r", 1);
				element.setAttribute("fill", "Black");
				element.setAttribute("stroke", "none");
				
				canvas.appendChild(element);
			}
			
			element.setAttribute("cx", screenX);
			element.setAttribute("cy", screenY);
		}
	}
	
	var Plane = function(a, b, c, d) {
		var position = [
			a,
			b,
			c,
			d
		];
		
		var element = null;
		
		this.getPoints = function() {
			return position;
		}
		
		this.update = function(a, b, c, d) {
			position = [
				a,
				b,
				c,
				d
			];
		};
		
		this.render = function(camera, canvas) {
			var relativeCoordinates = [
				projectPointOntoLens(position[0], camera),
				projectPointOntoLens(position[1], camera),
				projectPointOntoLens(position[2], camera),
				projectPointOntoLens(position[3], camera)
			]
			
			var coordinates = [
				[relativeCoordinates[0][0] * canvas.offsetWidth, relativeCoordinates[0][1] * canvas.offsetWidth],
				[relativeCoordinates[1][0] * canvas.offsetWidth, relativeCoordinates[1][1] * canvas.offsetWidth],
				[relativeCoordinates[2][0] * canvas.offsetWidth, relativeCoordinates[2][1] * canvas.offsetWidth],
				[relativeCoordinates[3][0] * canvas.offsetWidth, relativeCoordinates[3][1] * canvas.offsetWidth]
			];
			
			if (!element) {
				element = document.createElementNS(svg, "path");
				element.setAttribute("fill", "rgba(240, 200, 200, 0.5)");
				element.setAttribute("stroke", "Black");
				
				canvas.appendChild(element);
			}
			element.setAttribute("d", "M " + coordinates[0][0] + " " + coordinates[0][1] + " L " + coordinates[1][0] + " " + coordinates[1][1] + " L " + coordinates[2][0] + " " + coordinates[2][1] + " L " + coordinates[3][0] + " " + coordinates[3][1] + " Z");
		}
	}
	
	var Cuboid = function(a, b, c, d) {
		var position = [
			a,
			b,
			c,
			d
		];
		position[4] = vectorMinus(vectorAdd(b, c), a);
		position[5] = vectorMinus(vectorAdd(b, d), a);
		position[6] = vectorMinus(vectorAdd(c, d), a);
		position[7] = vectorMinus(vectorAdd(position[4], d), a);
	
		var planes = [
			new Plane(position[0], position[1], position[4], position[2]),
			new Plane(position[0], position[3], position[6], position[2]),
			new Plane(position[1], position[5], position[7], position[4]),
			new Plane(position[0], position[1], position[5], position[3]),
			new Plane(position[2], position[6], position[7], position[4]),
			new Plane(position[3], position[5], position[7], position[6])
		];
		
		this.getPoints = function() {
			return [
				position[0],
				position[1],
				position[2],
				position[3] // Don't return more points than are used in the update() method!
			];
		}
		
		this.update = function(a, b, c, d) {
			position = [
				a,
				b,
				c,
				d
			];
			position[4] = vectorMinus(vectorAdd(b, c), a);
			position[5] = vectorMinus(vectorAdd(b, d), a);
			position[6] = vectorMinus(vectorAdd(c, d), a);
			position[7] = vectorMinus(vectorAdd(position[4], d), a);
		
			planes[0].update(position[0], position[1], position[4], position[2]);
			planes[1].update(position[0], position[3], position[6], position[2]);
			planes[2].update(position[1], position[5], position[7], position[4]);
			planes[3].update(position[0], position[1], position[5], position[3]);
			planes[4].update(position[2], position[6], position[7], position[4]);
			planes[5].update(position[3], position[5], position[7], position[6]);
		};
		
		this.render = function(camera, canvas) {
			for (var x in planes) {
				planes[x].render(camera, canvas);
			};
		}
	}
	
	// *** END 3D Objects *** //
	
	// *** START helper methods *** //
	
	function projectPointOntoLens(vector, camera) {
		var lambda = 1;
		var increment = 0.5;
		
		// TODO: could be stored in the camera object for performace boost
		var relativeZero = vectorMinus(camera.lensZero, camera.origin);
		// TODO: could be stored in the camera object for performace boost
		var relativeLensCenter = vectorMinus(camera.lensCenter, camera.origin);
		
		var relativePoint = vectorMinus(vector, camera.origin);
		
		var projection = relativePoint;
		
		var dot = absoluteValue(dotProduct(vectorMinus(projection, relativeLensCenter), relativeLensCenter));
		
		for (var x = 0; x < accuracy; x++) {
			var upProjection = scale(relativePoint, lambda + increment);
			var downProjection = scale(relativePoint, lambda - increment);
			
			var upDot = absoluteValue(dotProduct(vectorMinus(upProjection, relativeLensCenter), relativeLensCenter));
			var downDot = absoluteValue(dotProduct(vectorMinus(downProjection, relativeLensCenter), relativeLensCenter));
			
			if (upDot < dot) {
				lambda += increment;
				projection = upProjection;
				dot = upDot;
						} else if (downDot < dot) {
				lambda -= increment;
				projection = downProjection;
				dot = downDot;
			}
			
			if (dot < 0.01) continue; // Say the correct Lambda is 0.25
			if (lambda > 1) return null; // The point is behind the camera
			
			increment /= 2;
		}
		
		var relativeProjection = vectorMinus(projection, relativeZero);
		
		// TODO: could be stored in the camera object for performace boost
		var relativeXAxis = vectorMinus(camera.lensXAxis, camera.lensZero);
		
		var angleOnLens = measureAngle(relativeProjection, relativeXAxis);
		var projectionLength = mod(relativeProjection);
		
		return [projectionLength * Math.cos(angleOnLens) / camera.lensWidth, 1 - (projectionLength * Math.sin(angleOnLens) / camera.lensHeight)];
	}
	
	function vectorMinus(a, b) {
		return [
			a[0] - b[0],
			a[1] - b[1],
			a[2] - b[2]
		];
	}
	
	function vectorAdd(a, b) {
		return [
			a[0] + b[0],
			a[1] + b[1],
			a[2] + b[2]
		];
	}
	
	function vectorTransform(vector, transform) {
		return [
			(transform[0][0] * vector[0] + transform[0][1] * vector[1] + transform[0][2] * vector[2]),
			(transform[1][0] * vector[0] + transform[1][1] * vector[1] + transform[1][2] * vector[2]),
			(transform[2][0] * vector[0] + transform[2][1] * vector[1] + transform[2][2] * vector[2])
		];
	}
	
	function scale(vector, scale) {
		return [
			vector[0] * scale,
			vector[1] * scale,
			vector[2] * scale
		];
	}
	
	function mod(vector) {
		return Math.sqrt(Math.pow(vector[0], 2) + Math.pow(vector[1], 2) + Math.pow(vector[2], 2));
	}
	
	function dotProduct(a, b) {
		return (a[0] * b[0]) + (a[1] * b[1]) + (a[2] * b[2]);
	}
	
	function measureAngle(a, b) {
		return Math.acos(dotProduct(a, b) / (mod(a) * mod(b)));
	}
	
	function absoluteValue(value) {
		return (value < 0) ? value * -1 : value;
	}
	
	// *** END helper methods *** //
	
	if (typeof(cameraPosition) == "undefined") {
		cameraPosition = [0, 20, -100];
	}
	
	if (typeof(lensZero) == "undefined") {
		lensZero = [cameraPosition[0] - 5, cameraPosition[1] - 4, cameraPosition[2] + 10];
	}
	if (typeof(lensXAxis) == "undefined") {
		lensXAxis = [cameraPosition[0] + 5, cameraPosition[1] - 4, cameraPosition[2] + 10];
	}
	if (typeof(lensYAxis) == "undefined") {
		lensYAxis = [cameraPosition[0] - 5, cameraPosition[1] + 4, cameraPosition[2] + 10];
	}
	
	if (typeof(accuracy) == "undefined") {
		accuracy = 10;
	}
	
	var canvas = document.createElementNS(svg, "svg");
	canvas.setAttribute("width", frame.clientWidth);
	canvas.setAttribute("height", frame.clientHeight);
	frame.appendChild(canvas);
	
	var container = new SVG3DScene(canvas);
	container.camera.origin = cameraPosition;
	container.camera.lens = {
		zero: lensZero,
		xAxis: lensXAxis,
		yAxis: lensYAxis
	};
	
	return container;
};