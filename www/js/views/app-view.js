/*global Backbone, jQuery, _, ENTER_KEY */
var app = app || {};
var map;
var currentMarker;

(function ($) {
	'use strict';

	// The Application
	// ---------------

	// Our overall **AppView** is the top-level piece of UI.
	app.AppView = Backbone.View.extend({

		// Instead of generating a new element, bind to the existing skeleton of
		// the App already present in the HTML.
		el: '#todoapp',

		// Our template for the line of statistics at the bottom of the app.
		statsTemplate: _.template($('#stats-template').html()),

		// Delegated events for creating new items, and clearing completed ones.
		events: {
			'keypress #new-todo': 'createOnEnter',
			'click #clear-completed': 'clearCompleted',
			'click #take-pic': 'Camera',
			'click #toggle-all': 'toggleAllComplete'
		},

		// At initialization we bind to the relevant events on the `Todos`
		// collection, when items are added or changed. Kick things off by
		// loading any preexisting todos that might be saved in *localStorage*.
		initialize: function () {
			this.allCheckbox = this.$('#toggle-all')[0];
			this.$input = this.$('#new-todo');
			this.$footer = this.$('#footer');
			this.$main = this.$('#main');
			this.$list = $('#todo-list');
			this.$image = $('#myImage');
			this.$imageData = $('#imageData');
			this.$lat = $('#lat');
			this.$long = $('#long');
			
			_.bindAll(this, 'onCameraSuccess', 'onCameraFail');
			_.bindAll(this, 'onLocationSuccess', 'onLocationError');

			this.listenTo(app.todos, 'add', this.addOne);
			this.listenTo(app.todos, 'reset', this.addAll);
			this.listenTo(app.todos, 'change:completed', this.filterOne);
			this.listenTo(app.todos, 'filter', this.filterAll);
			this.listenTo(app.todos, 'all', this.render);
			
			document.addEventListener('deviceready', this.onDeviceReady, false);
			this.onDeviceReady();

			// Suppresses 'add' events with {reset: true} and prevents the app view
			// from being re-rendered for every model. Only renders when the 'reset'
			// event is triggered at the end of the fetch.
			app.todos.fetch({reset: true});
		},
		
		thing: function() {
			alert("stuff");
		},
		
		onDeviceReady: function() {
			//app.todos.create(this.newAttributes());
			alert("eh");
			navigator.geolocation.watchPosition(this.onLocationSuccess, this.onLocationError, {enableHighAccuracy : true});
		},
		
		onLocationSuccess: function(position) {
			
			var longitude = position.coords.longitude;
			var latitude = position.coords.latitude;
			var latLong = new google.maps.LatLng(latitude, longitude);
			
			document.getElementById('lat').value = latitude;
			document.getElementById('long').value = longitude;
			
			var mapOptions = {
				center: latLong,
				zoom: 16,
				mapTypeId: google.maps.MapTypeId.ROADMAP
			};
			
			if (map == null) {
				map = new google.maps.Map(document.getElementById("geolocation"), mapOptions);  
				document.getElementById("geolocation").className = document.getElementById("geolocation").className + " geolocation-active";
				app.todos.each(function (todo) {
					//alert(todo.get('lat')+", "+todo.get('long'));
					var marker = new google.maps.Marker({
						draggable: false,
						raiseOnDrag: false,
						icon:'img/car.png',
						map: map,
						position: new google.maps.LatLng(todo.get('lat'), todo.get('long'))
					});
				});
			} else {
				map.setCenter(latLong);
			}
			
			if (currentMarker != null) {
				currentMarker.setMap(null);
			}
			
			currentMarker = new google.maps.Marker({
				draggable: false,
				raiseOnDrag: false,
				icon:'img/person2.png',
				map: map,
				position: latLong
			});			
			
		},
		
		onLocationError: function(error) {
			alert('code: ' +error.code+ '\n' + 'message: ' +error.message + '\n');
		},
		
		onCameraSuccess: function(imageData) {
			var image = document.getElementById('myImage');
			image.src = "data:image/jpeg;base64," + imageData;
			document.getElementById('imageData').value =  "data:image/jpeg;base64," + imageData;
			
			this.create();
		},
		
		onCameraFail: function(message) {
			alert('Failed because: ' + message);
		},
		
		Camera: function() {
			alert("Camera attempt");
			navigator.camera.getPicture(this.onCameraSuccess, this.onCameraFail, { quality: 50,
				destinationType: Camera.DestinationType.DATA_URL,
				targetWidth: 250,
				targetHeight: 250,
				correctOrientation: true
			});
		},

		// Re-rendering the App just means refreshing the statistics -- the rest
		// of the app doesn't change.
		render: function () {
			var completed = app.todos.completed().length;
			var remaining = app.todos.remaining().length;

			if (app.todos.length) {
				this.$main.show();
				this.$footer.show();

				this.$footer.html(this.statsTemplate({
					completed: completed,
					remaining: remaining
				}));

				this.$('#filters li a')
					.removeClass('selected')
					.filter('[href="#/' + (app.TodoFilter || '') + '"]')
					.addClass('selected');
			} else {
				this.$main.hide();
				this.$footer.hide();
			}

			this.allCheckbox.checked = !remaining;
		},

		// Add a single todo item to the list by creating a view for it, and
		// appending its element to the `<ul>`.
		addOne: function (todo) {
			var view = new app.TodoView({ model: todo });
			this.$list.append(view.render().el);
		},

		// Add all items in the **Todos** collection at once.
		addAll: function () {
			this.$list.html('');
			app.todos.each(this.addOne, this);
		},

		filterOne: function (todo) {
			todo.trigger('visible');
		},

		filterAll: function () {
			app.todos.each(this.filterOne, this);
		},

		// Generate the attributes for a new Todo item.
		newAttributes: function () {
			return {
				title: this.$input.val().trim(),
				order: app.todos.nextOrder(),
				completed: false,
				lat: this.$lat.val(),
				long: this.$long.val(),
				image: this.$imageData.val()
			};
		},

		// If you hit return in the main input field, create new **Todo** model,
		// persisting it to *localStorage*.
		createOnEnter: function (e) {
			if (e.which === ENTER_KEY && this.$input.val().trim()) {
				app.todos.create(this.newAttributes());
				this.$input.val('');
			}
		},
		
		create: function() {
			app.todos.create(this.newAttributes());
		},

		// Clear all completed todo items, destroying their models.
		clearCompleted: function () {
			_.invoke(app.todos.completed(), 'destroy');
			return false;
		},

		toggleAllComplete: function () {
			var completed = this.allCheckbox.checked;

			app.todos.each(function (todo) {
				todo.save({
					completed: completed
				});
			});
		}
	});
})(jQuery);