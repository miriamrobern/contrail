var contrail = {

	newGame:  function() {
		view.clearFeed();
		currentGame = {
			turns: 0,
			time: new Date(0),
			vars: {},
			options: currentGame.options,
			textBackup: [],
		};
		if (currentGame.options == undefined) {currentGame.options = {}};
		gameController.newGame();
		if (gameController.startLocation) {contrail.moveLocation(gameController.startLocation);};
		view.updateDefaultActions();
		view.updatePortrait();
		view.updateStats();
		view.updateActions();
		view.updateTime();
	},
	
	loadGame: function() {
		var gameSave = localStorage[gameController.savePrefix];
		if (gameController.loadGame) {
			currentGame = gameController.loadGame(gameSave);
		} else {
			currentGame = JSON.parse(gameSave);
		};
		view.clearFeed();
		view.addToFeed(currentGame.textBackup);
		view.addToFeed("<span class='gameAlert'>Game Loaded</span>",true);
		if (currentGame.time) {
			currentGame.time = new Date(currentGame.time);
			view.updateTime();
		};
		if (currentGame.location) {
			view.displayLocation();
			view.updateMap();
		};
		view.updatePortrait();
		view.updateActions();
		view.updateDefaultActions();
	},
	
	saveGame: function() {
		var gameSave;
		if (gameController.serializeGame) {
			gameSave = gameController.serializeGame();
		} else {
			gameSave = JSON.stringify(currentGame);
		};
		var savePrefix = gameController.savePrefix;
		if (savePrefix == undefined) {
			savePrefix = gameController.title.replace(' ','');
		};
		localStorage[savePrefix] = gameSave;
		view.updateDefaultActions();
	},
	
	dosupportURL: function() {
		window.open(gameController.supportURL);
	},
	
	doLink: function(entry,bookmark) {
		if (currentGame) {
			contrail.incrementTime();
			view.updateTime();
			if (bookmark) {
				currentGame.lastBookmark = bookmark;
			} else {
				console.log('missing bookmark');
			};
		};
		if (typeof entry == 'function') {
			var executedEntry = entry();
			if (executedEntry && currentGame && currentGame.location) {
				view.addToFeed(executedEntry);
			} else if (executedEntry) {
				view.addToFeed(executedEntry,true);
			};
		} else if (currentGame && currentGame.location) {
			view.addToFeed(entry);
		} else {
			view.addToFeed(entry,true);
		};
	},
	
	incrementTime: function(seconds) {
		if (seconds == undefined && gameController.defaultTimeIncrement) {
			seconds = gameController.defaultTimeIncrement;
		} else if (seconds == undefined) {
			seconds = 1;
		};
		if (currentGame && currentGame.time !== undefined) {
			currentGame.time = new Date(currentGame.time.getTime() + seconds * 1000);
		};
		if (currentGame && currentGame.turns !== undefined) {
			currentGame.turns++;
		};
		if (gameController.timePasses) {
			gameController.timePasses(seconds);
		};
		view.updateStats();
		view.updateTime();
	},
	
	wait: function() {
		if (gameController.wait) {
			gameController.wait();
		} else {
			view.addToFeed("You wait.",true);
		};
		contrail.incrementTime();
	},
	
	setVar: function(name,value) {
		if (value == undefined) {value = true};
		if (currentGame) {
			if (currentGame.vars == undefined) {currentGame.vars = {}};
			currentGame.vars[name] = value;
			return value;
		} else {
			console.log("Error: no currentGame");
			return "ERROR: no currentGame";
		};
	},
	
	getVar: function(name) {
		if (currentGame && currentGame.vars) {
			return currentGame.vars[name];
		} else {
			return "ERROR: no currentGame";
		};
	},
	
	modifyVar: function(varName,value) {
		if (currentGame.vars[varName]) {
			if (value.indexOf('+') == 0 || value.indexOf('-') == 0) {
				currentGame.vars[varName] += parseInt(value);
			} else {
				currentGame.vars[varName] = value;
			};
		} else {
			console.log('ERROR: No such stat as "'+varName+'"');
		};
		view.updateStats();
	},
	
	rollVar: function(varName) {
		var total = 0;
		for (var i=0;i<currentGame.vars[varName];i++) {
			total += Math.random();
		};
		return total;
	},
	
	moveLocation: function(newLocation) {
		currentGame.location = newLocation;
		if (currentGame.locations == undefined) {currentGame.locations = {}};
		if (currentGame.locations[newLocation] == undefined) {
			contrail.initLocation(newLocation);
			currentGame.locations[newLocation].visits++;
		} else {
			currentGame.locations[newLocation].visits++;
		};
		if (gameController.locations[newLocation].map) {
			view.updateMap();
		};
		view.displayLocation();
		view.updateActions();
		view.updateTime();
	},
	
	initLocation: function(location) {
		if (gameController.locations && gameController.locations[location] !== undefined) {
			currentGame.locations[location] = {
				name: gameController.locations[location].name,
				visits: 0,
				contentsAdded: [],
				contentsRemoved: [],
			};
			view.updateMap();
		} else {
			console.log("ERROR: no such location as '"+location+"'.");
		};
	},
	
	useExit: function(exit) {
		if (contrail.getVar('globalExitLock')) {
			if (contrail.getVar('globalExitLock') == true) {
				view.addToFeed("You can't use exits right now.");
			} else {
				view.addToFeed(contrail.getVar('globalExitLock'));
			};
		} else if (exit.unlockedBy && (currentGame.vars == undefined || currentGame.vars[exit.unlockedBy] !== true)) {
			var lockMessage = "That exit seems to be locked.";
			if (exit.lockMessage) {
				lockMessage = exit.lockMessage;
			};
			view.addToFeed(lockMessage);
		} else if (gameController.locations[exit.destination]) {
			var transitionDiv = document.createElement('div');
			transitionDiv.className = 'transitionDiv';
			var p = document.createElement('p');
			transitionDiv.appendChild(p);
			if (exit.transition) {
				p.innerHTML = exit.transition;
			} else if (gameController.defaultExitTransition) {
				p.innerHTML = gameController.defaultExitTransition(exit);
			} else {
				p.innerHTML = "You take the "+exit.label+" exit.";
			};
			view.addToFeed(transitionDiv,true);
			var oldLocation = currentGame.location;
			contrail.moveLocation(exit.destination);
			if (exit.execute) {
				if (gameController.locations[oldLocation][exit.execute]) {
					gameController.locations[oldLocation][exit.execute]();
				} else if (gameController[exit.execute]) {
					gameController[exit.execute]();
				};
			};
			contrail.incrementTime(exit.time);
		} else {
			view.addToFeed('That exit seems to be blocked.');
			console.log("ERROR: No such destination in gameController.locations:",exit.destination);
		};
	},
	
	takeAction: function(action,functionCall) {
		if (action.unlockedBy && contrail.getVar(action.unlockedBy) !== true) {
			view.addToFeed(action.lockMessage);
		} else {
			contrail.incrementTime();
			functionCall();
			if (currentGame && currentGame.inventory) {
				view.updateInventory();
			};
			view.updateLocationButtons();
		};
	},
	
	pickupItem: function(item) {
		contrail.incrementTime(item.pickupTime);
		var index;
		if (gameController.locations[currentGame.location].contents.indexOf(item) !== -1) { // native item
			currentGame.locations[currentGame.location].contentsRemoved.push(item);
		} else if (currentGame.locations[currentGame.location].contentsAdded.indexOf(item) !== -1) { // added item
			index = currentGame.locations[currentGame.location].contentsAdded.indexOf(item);
			currentGame.locations[currentGame.location].contentsAdded.splice(index,1);
		};
		currentGame.inventory.push(item);
		if (typeof item == 'object' && item.desc && item.examined !== true) {
			item.examined = true;
			if (typeof item.desc == 'function') {
				view.addToFeed(item.desc(),false,false);
			} else {
				view.addToFeed(item.desc,false,false);
			};
		} else if (typeof item == 'object' && item.qty) {
			var plural = '';
			if (item.qty > 1 && item.plural) {plural = item.plural} else if (item.qty > 1) {plural = 's'};
			view.addToFeed("You pick up "+item.qty + " " + item.name + plural + ".",false,false);
		} else if (typeof item == 'object') {
			view.addToFeed("You pick up "+item.name+".",false,false);
		} else {
			view.addToFeed("You pick up "+item+".",false,false);
		};
		view.updateInventory();
		view.updateLocationButtons();
	},
	
	examineItem: function(item) {
		var defaultExamine = true, customExamine;
		if (item.itemUses !== undefined) {
			for (var useObject of item.itemUses) {
				if (useObject.label == 'Examine') {
					defaultExamine = false;
					customExamine = useObject;
				};
			};
		};
		if (defaultExamine && typeof item.desc == 'function') {
			view.addToFeed(item.desc());
		} else if (defaultExamine) {
			view.addToFeed(item.desc);
		} else {
			gameController[customExamine.execute].bind(item)()
		};
	},
	
	dropItem: function(item,li) {
		contrail.incrementTime(item.dropTime);
		var index = currentGame.inventory.indexOf(item);
		if (index !== -1) {
			currentGame.inventory.splice(index,1);
		};
		if (gameController.locations[currentGame.location].contents.indexOf(item) !== -1) { // native item
			index = currentGame.locations[currentGame.location].contentsRemoved.indexOf(item);
			currentGame.locations[currentGame.location].contentsRemoved.splice(index,1);
		} else { // new item
			currentGame.locations[currentGame.location].contentsAdded.push(item);
		};
		if (li) {
			li.className = 'hidden';
		};
		view.updateLocationButtons();
		if (typeof item == 'string') {
			view.addToFeed("You drop "+item+".");
		} else if (typeof item == 'object') {
			view.addToFeed("You drop "+item.name+".");
		};
	},
	
	buildContentsArray: function(locationKey) {
		var location = gameController.locations[locationKey];
		if (location.contents == undefined) {location.contents = [];};
		var contentsArray = [];
		contentsArray = contentsArray.concat(location.contents);
		contentsArray = contentsArray.concat(currentGame.locations[locationKey].contentsAdded);
		for (item of currentGame.locations[locationKey].contentsRemoved) {
			index = contentsArray.indexOf(item);
			if (index !== -1) {
				contentsArray.splice(index,1);
			};
		};
		return contentsArray;
	},
	
	hasItem: function(item) {
		if (typeof item == 'object' && item.id) {
			item = item.id;
		} else if (typeof item == 'object' && item.name) {
			item = item.name;
		};
		if (currentGame.inventory.indexOf(item) !== -1) {
			return true;
		} else {
			for (var invItem of currentGame.inventory) {
				if (invItem.name == item || invItem.id == item) {
					return true;
				};
			};
		};
	},
	
	useItem: function(item,useIndex) {
		contrail.incrementTime();
		var itemName;
		if (typeof item == 'object') {
			itemName = item.name.replace(/\s+/g,'')
		} else {
			itemName = item.replace(/\s+/g,'');
		};
		if (useIndex !== undefined) {
			gameController[item.itemUses[useIndex].execute].bind(item)();
		} else if (currentGame.location && gameController.locations[currentGame.location]['use'+itemName]) { // location-specific function
			gameController.locations[currentGame.location]['use'+itemName].bind(item)();
		} else if (gameController['use'+itemName]) { // global function
			gameController['use'+itemName].bind(item)();
		} else {
			console.log("ERROR: Cannot find a function for ",item);
		};
		view.updateMap();
		view.updateLocationButtons();
	},
	
	removeItem: function(item) {
		var index = currentGame.inventory.indexOf(item);
		if (index == -1) {
			for (var i=0;i<currentGame.inventory.length;i++) {
				if (currentGame.inventory[i].name == item) {
					index = i;
				};
			};
		};
		if (index !== -1) {
			currentGame.inventory.splice(index,1);
		};
		view.updateInventory();
	},
	
	revealMap: function() {
		if (currentGame == undefined) {currentGame = {locations:{}};};
		for (var location in gameController.locations) {
			if (currentGame.locations[location] == undefined) {
				contrail.initLocation(location);
			};
		};
		view.updateMap();
	},
	
	defaultSubs: {
	
		time: function() {
			if (currentGame == undefined || currentGame.time == undefined) {
				return '$time';
			} else {
			};
		},
	
		they: function() {return contrail.defaultSubs.they1},
		them: function() {return contrail.defaultSubs.them1},
		their: function() {return contrail.defaultSubs.their1},
		theirs: function() {return contrail.defaultSubs.theirs1},
		themself: function() {return contrail.defaultSubs.themself1},
		They: function() {return contrail.defaultSubs.They1},
		Them: function() {return contrail.defaultSubs.Them1},
		Their: function() {return contrail.defaultSubs.Their1},
		Theirs: function() {return contrail.defaultSubs.Theirs1},
		Themself: function() {return contrail.defaultSubs.Themself1},
		formal: function() {return contrail.defaultSubs.formal1},
		Formal: function() {return contrail.defaultSubs.Formal1},
		s: function() {return contrail.defaultSubs.s1},
		es: function() {return contrail.defaultSubs.es1},
		isAre: function() {return contrail.defaultSubs.isAre1},
		hasHave: function() {return contrail.defaultSubs.hasHave1},
		
		switchToThem: function() {contrail.switchPronounSet(1,'pronounsThem');},
		switchToHer: function() {contrail.switchPronounSet(1,'pronounsHer');},
		switchToHim: function() {contrail.switchPronounSet(1,'pronounsHim');},
		switchToYou: function() {contrail.switchPronounSet(1,'pronounsYou');},
		switchToZir: function() {contrail.switchPronounSet(1,'pronounsZir');},
		
		switch1ToThem: function() {contrail.switchPronounSet(1,'pronounsThem');},
		switch1ToHer: function() {contrail.switchPronounSet(1,'pronounsHer');},
		switch1ToHim: function() {contrail.switchPronounSet(1,'pronounsHim');},
		switch1ToYou: function() {contrail.switchPronounSet(1,'pronounsYou');},
		switch1ToZir: function() {contrail.switchPronounSet(1,'pronounsZir');},
		
		switch2ToThem: function() {contrail.switchPronounSet(2,'pronounsThem');},
		switch2ToHer: function() {contrail.switchPronounSet(2,'pronounsHer');},
		switch2ToHim: function() {contrail.switchPronounSet(2,'pronounsHim');},
		switch2ToYou: function() {contrail.switchPronounSet(2,'pronounsYou');},
		switch2ToZir: function() {contrail.switchPronounSet(2,'pronounsZir');},
		
		switch3ToThem: function() {contrail.switchPronounSet(3,'pronounsThem');},
		switch3ToHer: function() {contrail.switchPronounSet(3,'pronounsHer');},
		switch3ToHim: function() {contrail.switchPronounSet(3,'pronounsHim');},
		switch3ToYou: function() {contrail.switchPronounSet(3,'pronounsYou');},
		switch3ToZir: function() {contrail.switchPronounSet(3,'pronounsZir');},
		
		switch4ToThem: function() {contrail.switchPronounSet(4,'pronounsThem');},
		switch4ToHer: function() {contrail.switchPronounSet(4,'pronounsHer');},
		switch4ToHim: function() {contrail.switchPronounSet(4,'pronounsHim');},
		switch4ToYou: function() {contrail.switchPronounSet(4,'pronounsYou');},
		switch4ToZir: function() {contrail.switchPronounSet(4,'pronounsZir');},
		
		switch5ToThem: function() {contrail.switchPronounSet(5,'pronounsThem');},
		switch5ToHer: function() {contrail.switchPronounSet(5,'pronounsHer');},
		switch5ToHim: function() {contrail.switchPronounSet(5,'pronounsHim');},
		switch5ToYou: function() {contrail.switchPronounSet(5,'pronounsYou');},
		switch5ToZir: function() {contrail.switchPronounSet(5,'pronounsZir');},
	},
	pronounSets: {
		pronounsThem: {
			they: 'they',
			them: 'them',
			their: 'their',
			theirs: 'theirs',
			themself: 'themself',
			They: 'They',
			Them: 'Them',
			Their: 'Their',
			Theirs: 'Theirs',
			Themself: 'Themself',
			formal: 'ser',
			Formal: 'Ser',
			s: '',
			es: '',
			isAre: 'are',
			hasHave: 'have',
		},
		pronounsHer: {
			they: 'she',
			them: 'her',
			their: 'her',
			theirs: 'hers',
			themself: 'herself',
			They: 'She',
			Them: 'Her',
			Their: 'Her',
			Theirs: 'Hers',
			Themself: 'Herself',
			formal: "ma'am",
			Formal: "Ma'am",
			s: 's',
			es: 'es',
			isAre: 'is',
			hasHave: 'has',
		},
		pronounsHim: {
			they: 'he',
			them: 'him',
			their: 'his',
			theirs: 'his',
			themself: 'himself',
			They: 'He',
			Them: 'Him',
			Their: 'His',
			Theirs: 'His',
			Themself: 'Himself',
			formal: 'sir',
			Formal: 'Sir',
			s: 's',
			es: 'es',
			isAre: 'is',
			hasHave: 'has',
		},
		pronounsYou: {
			they: 'you',
			them: 'you',
			their: 'your',
			theirs: 'yours',
			themself: 'yourself',
			They: 'You',
			Them: 'You',
			Their: 'Your',
			Theirs: 'Yours',
			Themself: 'Yourself',
			formal: '',
			Formal: '',
			s: '',
			es: '',
			isAre: 'are',
			hasHave: 'have',
		},
		pronounsIt: {
			they: 'it',
			them: 'it',
			their: 'its',
			theirs: 'its',
			themself: 'itself',
			They: 'It',
			Them: 'It',
			Their: 'Its',
			Theirs: 'Its',
			Themself: 'Itself',
			formal: 'ser',
			Formal: 'Ser',
			s: 's',
			es: 'es',
			isAre: 'is',
			hasHave: 'has',
		},
		pronounsZir: {
			they: 'ze',
			them: 'zir',
			their: 'zir',
			theirs: 'zirs',
			themself: 'zirself',
			They: 'Ze',
			Them: 'Zir',
			Their: 'Zir',
			Theirs: 'Zirs',
			Themself: 'Zirself',
			formal: 'zer',
			Formal: 'Zer',
			s: 's',
			es: 's',
			isAre: 'is',
			hasHave: 'has',
		},
	},
	
	switchPronounSet: function(index,setKey) {
		var pronounSet = contrail.pronounSets[setKey];
		if (gameController !== undefined && gameController.pronounSets !== undefined && gameController.pronounSets[setKey]) {pronounSet = gameController.pronounSets[setKey]};
		if (pronounSet !== undefined) {
			for (var key in contrail.pronounSets.pronounsThem) {
				contrail.defaultSubs[key+index] = contrail.pronounSets.pronounsThem[key];
			};
			for (var key in pronounSet) {
				contrail.defaultSubs[key+index] = pronounSet[key];
			};
		} else {
			console.log('ERROR: cannot find pronoun set:',setKey);
		};
	},
	
	randomMap: function(bounds,maxLocations) {
		if (bounds==undefined) {
			bounds = {
				minX:-100,
				maxX:100,
				minY:-100,
				maxY:100
			};
		};
		var randomMap = [];
		var newCoords;
		for (var i = 0; i<50 ; i++) {
			var newCoords = {
				x: Math.random() * (bounds.maxX-bounds.minX) + bounds.minX << 0,
				y: Math.random() * (bounds.maxY-bounds.minY) + bounds.minY << 0,
				height: Math.random() * Math.random() * 20 + 10 << 0,
				width: Math.random() * Math.random() * 20 + 10 << 0,
			};
			if (Math.random() < 0.8) {
				newCoords.shape = 'rect'
			} else {
				newCoords.shape = 'ellipse';
			};
			var noOverlap = true
			var newCoordsLeft = newCoords.x - newCoords.width * 0.5;
			var newCoordsRight = newCoords.x + newCoords.width * 0.5;
			var newCoordsTop = newCoords.y - newCoords.height * 0.5;
			var newCoordsBottom = newCoords.y + newCoords.height * 0.5;
			for (var existing of randomMap) {
				var existingLeft = existing.x - existing.width * 0.5 - 2;
				var existingRight = existing.x + existing.width * 0.5 + 2;
				var existingTop = existing.y - existing.height * 0.5 - 2;
				var existingBottom = existing.y + existing.height * 0.5 + 2;
				if (newCoordsLeft > existingRight || newCoordsRight < existingLeft || newCoordsTop > existingBottom || newCoordsBottom < existingTop) {
				} else {
					noOverlap = false
				};
			};
			if (noOverlap) {
				randomMap.push(newCoords);
				if (randomMap.length >= maxLocations) {i=Infinity};
			};
		};
		var locations = {};
		for (var i in randomMap) {
			var locObj = {
				name: 'Location ('+randomMap[i].x+","+randomMap[i].y+")",
				desc: 'Desc',
				exits: [],
				map: randomMap[i],
			};
			locations['randomLocation_'+i] = locObj;
		};
		var maxDist = Math.min(bounds.maxX-bounds.minX,bounds.maxY-bounds.minY)*0.35
		var dist;
		for (var i in locations) {
			var location = locations[i];
			for (var n in locations) {
				var destination = locations[n];
				dist = Math.pow(Math.pow(location.map.x-destination.map.x,2)+Math.pow(location.map.y-destination.map.y,2),0.5);
				if (dist < maxDist && n !== i) {
					var angle = Math.atan2(location.map.x-destination.map.x,location.map.y-destination.map.y);
					var index = 16*(angle+Math.PI) / (Math.PI*2) << 0;
					if (index == 15 ) {
						index = 0;
					} else {
						index = Math.ceil(index/2);
					};
					var label = ["North","Northwest","West","Southwest","South","Southeast",'East','Northeast'][index];
					destination.exits.push({label:label,destination:i,dist:dist});
				};
			};
		};
		for (i in locations) {
			location = locations[i];
			var exitLabelArray = [], exitRepeats = [];
			for (var exit of location.exits) {
				if (exitLabelArray.indexOf(exit.label) !== -1) {
					exitRepeats.push(exit.label);
				} else {
					exitLabelArray.push(exit.label);
				};
			};
			if (exitRepeats.length > 0) {
				for (var label of exitRepeats) {
					var closeExits = [];
					for (exit of location.exits) {
						if (exit.label == label) {
							closeExits.push(exit);
						};
					};
					for (exit of closeExits) {
						for (otherExit of closeExits) {
							if (exit.dist > otherExit.dist) {
								exit.remove = true
							};
						};
					};
				};
				for (exit of location.exits) {
					if (exit.remove) {
						for (var otherExit of locations[exit.destination].exits) {
							if (otherExit.destination == i) {
								otherExit.remove = true;
							};
						};
					};
				};
			};
			for (i in locations) {
				location = locations[i];
				for (exit of location.exits) {
					if (exit.remove) {
						location.exits.splice(location.exits.indexOf(exit),1);
					};
				};
			};
		};
		return locations;
	},
	
	testRandom: function() {
		var newLocations = contrail.randomMap({minX:100,maxX:200,minY:100,maxY:200});
		for (var locKey in newLocations) {
			gameController.locations[locKey] = newLocations[locKey];
		};
		currentGame = {
			locations: {},
		};
		contrail.moveLocation('randomLocation_0');
		contrail.revealMap();
	},
	
};
contrail.switchPronounSet(1,'pronounsThem');

var currentGame;

var handlers = {
};

var view = {

	init: function() {
		var body = document.body;
		body.innerHTML = '';
		
		var contrailDiv = document.createElement('div');
		contrailDiv.id = 'contrailDiv';
		body.appendChild(contrailDiv);
		
		var columns = [
			['contrailLeftColumn','contrailTitleDiv','contrailPortraitDiv','contrailStatsDiv','contrailActionsDiv'],
			['contrailCenterColumn','contrailFeedDiv'],
			['contrailRightColumn','contrailTimeDiv','contrailMapDiv','contrailContextualDiv'],
		];
		var thisColumn;
		for (var column of columns) {
			var div = document.createElement('div');
			div.id = column[0];
			contrailDiv.appendChild(div);
			thisColumn = div;
			for (var i=1;i<column.length;i++) {
				var div = document.createElement('div');
				div.id = column[i];
				thisColumn.appendChild(div);
				div.className = 'contrailDiv';
			};
		};

		var actionsDiv = document.getElementById('contrailActionsDiv');
		var gameActionsDiv = document.createElement('div');
		gameActionsDiv.id = 'gameActionsDiv';
		actionsDiv.appendChild(gameActionsDiv);
		gameActionsDiv.innerHTML = "&nbsp;";
		var defaultActionsDiv = document.createElement('div');
		defaultActionsDiv.id = 'defaultActionsDiv';
		actionsDiv.appendChild(defaultActionsDiv);
		view.updateDefaultActions();
		
		view.updateColors();
		
		var titleDiv = document.getElementById('contrailTitleDiv');
		var titleHead = document.createElement('h1');
		titleDiv.appendChild(titleHead);
		var bylineHead = document.createElement('h4');
		titleDiv.appendChild(bylineHead);
		if (gameController.title) {
			var titleNode = document.createElement('title');
			titleNode.innerHTML = gameController.title;
			body.firstChild.appendChild(titleNode);
			titleHead.innerHTML = gameController.title;
		} else {
			titleHead.innerHTML = "No title Defined";
		};
		if (gameController.byline) {
			bylineHead.innerHTML = gameController.byline;
		} else {
			bylineHead.innerHTML = "No byline Defined";
		};
		
		var feedColumn = document.getElementById('contrailFeedDiv');
		var launchEntry;
		if (typeof gameController.launchEntry == 'function') {
			launchEntry = gameController.launchEntry();
			if (launchEntry) {
				view.addToFeed(launchEntry);
			};
		} else if (typeof gameController.launchEntry == 'string' || gameController.launchEntry instanceof Array) {
			view.addToFeed(gameController.launchEntry,true);
		} else {
			feedColumn.innerHTML = "No launchEntry Defined.";
		};

		view.windowResize();
	},
	
	updateColors: function() {
		var body = document.body;
		body.style.background = 'black';
		body.style.color = 'white';
		if (gameController.colors) {
			for (var id in gameController.colors) {
				if (id == 'Background') {
					body.style.background = gameController.colors[id];
				} else if (id == 'Text') {
					body.style.color = gameController.colors[id];
				} else if (id.indexOf('Background') !== -1) {
					var node = document.getElementById('contrail'+id.replace('Background',''));
					if (node) {
						node.style.background = gameController.colors[id];
					};
				} else if (id.indexOf('Text') !== -1) {
					var node = document.getElementById('contrail'+id.replace('Text',''));
					if (node) {
						node.style.color = gameController.colors[id];
					};
				} else if (id.indexOf('Border') !== -1) {
					var node = document.getElementById('contrail'+id.replace('Border',''));
					if (node && gameController.colors[id] !== 'none') {
						node.style.border = '3px solid ' + gameController.colors[id];
					} else if (node) {
						node.style.border = 'none';
					};
				};
			};
		};
	},
	
	windowResize: function() {
		var contrailDiv = document.getElementById('contrailDiv');
		if (contrailDiv) {
			var viewport = view.viewport();
			viewport.height -= viewport.width * 0.03; // Taking #mainMenuDiv into account
			var contrailDivDimensions = {};
			contrailDivDimensions.height = 0.95 * Math.min(viewport.height,viewport.width*0.618);
			contrailDivDimensions.width = 0.95 * Math.min(viewport.width,viewport.height/0.618);
			contrailDiv.style.width = contrailDivDimensions.width;
			contrailDiv.style.height = contrailDivDimensions.height;
			contrailDiv.style.marginLeft = (viewport.width-contrailDivDimensions.width)/2;
		};
	},

	viewport: function() {
		var e = window, a = 'inner';
		if ( !( 'innerWidth' in window ) ) {
			a = 'client';
			e = document.documentElement || document.body;
		};
		return { width : e[ a+'Width' ] , height : e[ a+'Height' ] }
	},
	
	capitalize: function(string) {
    	return string.charAt(0).toUpperCase() + string.slice(1);
	},

	prettyList: function(list,andor) {
		if (andor == undefined) {andor = 'and'};
		var prettyList = '';
		for (item in list) {
			if (prettyList !== '') {prettyList += " "};
			prettyList += list[item];
			if (item == list.length-1) {
			} else if (list.length == 2) {
				prettyList += ' ' + andor;
			} else if (item == list.length-2) {
				prettyList += ', ' + andor;
			} else {
				prettyList += ',';
			};
		};
		return prettyList;
	},
	
	prettyNumber: function(integer) {
		var result = integer;
		if (integer < 0) {
			var sign = 'negative ';
			integer = Math.abs(integer);
		};
		if (integer < 20) {
			result = ["zero","one","two","three",'four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'][integer];
		};
		if (sign !== undefined) {
			result = sign + result;
		};
		return result;
	},
	
	updateDefaultActions: function() {
		var defaultActionsDiv = document.getElementById('defaultActionsDiv');
		defaultActionsDiv.innerHTML = '';
		if (gameController.newGame) {
			var newGameButton = document.createElement('button');
			newGameButton.innerHTML = "New Game";
			defaultActionsDiv.appendChild(newGameButton);
			newGameButton.addEventListener('click',contrail.newGame);
		};
		var priorSaves = false;
		var savePrefix = gameController.savePrefix;
		if (savePrefix == undefined) {savePrefix = gameController.title.replace(' ','');};
		var localStorageKeys = Object.keys(localStorage);
		for (var key of localStorageKeys) {
			if (key.indexOf(gameController.savePrefix) == 0) {
				priorSaves = true;
			};
		};
		var savesEnabled = true;
		if (gameController.savesDisabled || currentGame.location == undefined) {
			savesEnabled = false;
		};
		if (priorSaves && savesEnabled) {
			var loadGameButton = document.createElement('button');
			loadGameButton.innerHTML = "Load";
			defaultActionsDiv.appendChild(loadGameButton);
			loadGameButton.addEventListener('click',contrail.loadGame);
		};
		if (Object.keys(currentGame).length > 0 && savesEnabled) {
			var saveGameButton = document.createElement('button');
			saveGameButton.innerHTML = "Save";
			defaultActionsDiv.appendChild(saveGameButton);
			saveGameButton.addEventListener('click',contrail.saveGame);
		};
		if (gameController.gameOptions) {
			var optionsButton = document.createElement('button');
			optionsButton.innerHTML = "Options";
			defaultActionsDiv.appendChild(optionsButton);
			optionsButton.addEventListener('click',gameController.gameOptions);
		};
		if (gameController.supportURL) {
			defaultActionsDiv.appendChild(document.createElement('br'));
			var supportBtn = document.createElement('button');
			supportBtn.addEventListener('click',contrail.dosupportURL);
			supportBtn.innerHTML = 'Support This Game';
			if (gameController.supportLabel) {supportBtn.innerHTML = gameController.supportLabel;};
			defaultActionsDiv.appendChild(supportBtn);
		}
	},
	
	clearFeed: function() {
		var feedDiv = document.getElementById('contrailFeedDiv');
		feedDiv.innerHTML = '';
	},
	
	addToFeed: function(node,newEntry,scroll) {
		var feedDiv = document.getElementById('contrailFeedDiv');
		var currentDiv = feedDiv.lastChild;
		if (currentDiv && currentDiv.children[0] && currentDiv.children[0].className == 'transitionDiv') {
			newEntry = false;
			currentDiv.children[0].className = '';
		};
		if (newEntry || currentDiv == null) {
			if (currentDiv) {
				currentDiv.className = 'oldEntry';
			};
			currentDiv = document.createElement('div');
			feedDiv.appendChild(currentDiv);
		};
		currentDiv.className = 'currentEntry';
		if (typeof node == 'string') {
			node = [node];
		};
		var result;
		if (node instanceof Array) {
			result = view.arrayToDiv(node);
		} else if (node instanceof Function) {
			var func = node();
			if (func instanceof HTMLElement) {
				result = func;
			} else {
				result = view.arrayToDiv(func);
			};
		} else {
			result = node;
		};
		if (currentGame && currentGame.textBackup) {
			var textBackup = document.createElement('div').appendChild(result).outerHTML;
			for (var i=0;i<5;i++) {
				currentGame.textBackup[i] = currentGame.textBackup[i+1];
			};
			currentGame.textBackup[5] = textBackup;
		};
		currentDiv.appendChild(result);
		if (scroll !== false) {
			currentDiv.scrollIntoView({behavior:'smooth'});
		};
	},
	
	arrayToDiv: function(array) {
		if (typeof array == 'string') {array = [array]} else if (array==undefined) {array = []};
		var div = document.createElement('div');
		for (var paragraph of array) {
			if (typeof paragraph == 'string') {
				var p = document.createElement('p');
				div.appendChild(p);
				paragraph = view.parseQuotationMarks(paragraph);
				if (paragraph.indexOf('$') !== -1) {
					paragraph = view.parseStringWithSubs(paragraph);
				};
				p.appendChild(view.parseStringWithLinks(paragraph));
			} else if (typeof paragraph == 'object') {
				var p = document.createElement('p');
				div.appendChild(p);
				if (paragraph.className) {
					p.className = paragraph.className;
				};
				if (paragraph.button) {
					var button = document.createElement('button');
					if (paragraph.button.id) {button.id = paragraph.button.id};
					var labelString = view.parseQuotationMarks(paragraph.button.label);
					if (labelString.indexOf('$') == -1) {
						button.innerHTML = labelString;
					} else {
						button.innerHTML = view.parseStringWithSubs(labelString);
					};
					p.innerHTML += " ";
					p.appendChild(button);
					if (paragraph.button.passage) {
// 						button.addEventListener('click',view.addToFeed.bind(this,gameController[paragraph.button.passage]));
						button.addEventListener('click',contrail.doLink.bind(view,gameController[paragraph.button.passage],paragraph.button.passage));
					} else {
						p.addEventListener('click',paragraph.button.buttonFunction);
					};
				};
				if (paragraph.text) {
					var innerHTML = view.parseQuotationMarks(paragraph.text);
					if (innerHTML.indexOf('$') !== -1) {
						paragraph.text = view.parseStringWithSubs(innerHTML);
					};
					p.innerHTML += view.parseStringWithLinks(innerHTML).innerHTML;
				};
			};
		};
		return div;
	},
	
	parseQuotationMarks: function(string) {
		var preArray = string.split(">");
		var stringArray = [];
		for (var bit of preArray) {
			stringArray = stringArray.concat(bit.split("<"));
		};
		for (var i=0;i<stringArray.length;i++) {
			if (i % 2 == 1) {
				stringArray[i] = "<"+stringArray[i]+">";
			} else {
				stringArray[i] = stringArray[i].replace(/^'/g,'\u201C');
				stringArray[i] = stringArray[i].replace(/ '/g,' \u201C');
				stringArray[i] = stringArray[i].replace(/' /g,'\u201D ');
				stringArray[i] = stringArray[i].replace(/'$/g,'\u201D');
			};
		};
		return stringArray.join('');
	},
	
	parseStringWithSubs: function(string) {
		var stringArray = string.match(/\$\w+|\w+|\s+|[^\s\w]/g);
		for (var i in stringArray) {
			if (stringArray[i].indexOf('$') == 0) {
				var key = stringArray[i].substr(1);
				if (currentGame !== undefined && currentGame.vars[key] !== undefined) {
					stringArray[i] = currentGame.vars[key];
				} else if (gameController[key] !== undefined && gameController[key] instanceof Function) {
					stringArray[i] = gameController[key]();
				} else if (gameController[key] !== undefined) {
					stringArray[i] = gameController[key];
				} else if (contrail.defaultSubs[key] && contrail.defaultSubs[key] instanceof Function) {
					stringArray[i] = contrail.defaultSubs[key]();
				} else if (contrail.defaultSubs[key] !== undefined) {
					stringArray[i] = contrail.defaultSubs[key];
				};
			};
		};
		return stringArray.join('');
	},
	
	parseStringWithLinks: function(string) {
		var array = [];
		if (string.split('[[').length == string.split(']]').length) {
			string = string.split('[[');
			for (var bit of string) {
				array = array.concat(bit.split(']]'));
			};
		} else {
			array = [string];
		};
		var p = document.createElement('p');
		for (var i=0;i<array.length;i++) {
			if (i % 2 == 0) {
				var span = document.createElement('span');
				span.innerHTML = array[i];
				p.appendChild(span);
			} else {
				var link = document.createElement('a');
				p.appendChild(link);
				var deadLink = document.createElement('span');
				p.appendChild(deadLink);
				deadLink.className = 'deadLink';
				var entry, bookmark;
				if (array[i].indexOf('|') !== -1) {
					link.innerHTML = array[i].split('|')[0];
					deadLink.innerHTML = array[i].split('|')[0];
					entry = array[i].split('|')[1];
				} else {
					link.innerHTML = array[i];
					deadLink.innerHTML = array[i];
					entry = array[i].replace(' ','');
				};
				bookmark = entry;
				if (currentGame && currentGame.location && gameController.locations[currentGame.location][entry]) {
					entry = gameController.locations[currentGame.location][entry];
				} else if (gameController[entry]) {
					entry = gameController[entry];
				} else {
					console.log("Error: no such entry on gameController:",entry);
					entry = undefined;
				};
				if (entry) {
					link.addEventListener('click',contrail.doLink.bind(view,entry,bookmark));
					link.className = 'entryLink';
				};
			};
		};
		return p;
	},
	
	displayLocation: function() {
		var location = gameController.locations[currentGame.location];
		var locationNodes = document.createElement('div');
		if (location.name) {
			var locationNameHead = document.createElement('h3');
			locationNameHead.className = 'locationNameHead';
			locationNameHead.innerHTML = location.name;
			locationNodes.appendChild(locationNameHead);
		};
		if (typeof location.desc == 'function') {
			var descResult = location.desc();
			if (typeof descResult == 'string') {
				locationNodes.appendChild(view.arrayToDiv([descResult]));
			} else if (descResult instanceof Array) {
				locationNodes.appendChild(view.arrayToDiv(descResult));
			} else {
				locationNodes.appendChild(descResult);
			};
		} else if (typeof location.desc == 'string') {
			var p = document.createElement('p');
			p.innerHTML = location.desc;
			locationNodes.appendChild(p);
		} else if (location.desc instanceof Array) {
			locationNodes.appendChild(view.arrayToDiv(location.desc));
		};
		if (currentGame) {
			if (currentGame.inventory) {
				locationNodes.appendChild(view.buildContextualUseButtons(location));
			};
			locationNodes.appendChild(view.buildLocationActions(location));
			locationNodes.appendChild(view.buildLocationContents(currentGame.location));
			locationNodes.appendChild(view.buildLocationExits(location));
		};
		if (locationNodes.children.length > 0) {
			view.addToFeed(locationNodes,true);
		};
	},
	
	updateLocationButtons: function() {
		view.updateLocationActions();
		view.updateContextualUseButtons();
		view.updateLocationContents();
		view.updateLocationExits();
	},
	
	buildLocationActions: function(location) {
		var actionsNode = document.createElement('div');
		actionsNode.className = 'actionsNode';
		var action;
		for (var actionKey in location.actions) {
			action = location.actions[actionKey];
			if (action.visible == undefined || (currentGame.vars[action.visible] !== false && currentGame.vars[action.visible] !== undefined)) {
				actionsNode.appendChild(view.buildActionButton(action));
			};
		};
		return actionsNode;
	},
	
	updateLocationActions: function() {
		var currentDiv = document.getElementById('contrailFeedDiv').lastChild;
		var childDiv, actionsNode;
		for (var n=0;n<currentDiv.children.length;n++) {
			childDiv = currentDiv.children[n];
			for (var i=0;i<childDiv.children.length;i++) {
				if (childDiv.children[i].className.indexOf('actionsNode') !== -1) {
					actionsNode = childDiv.children[i];
				};
			};
		};
		if (actionsNode) {
			actionsNode.innerHTML = '';
			actionsNode.appendChild(view.buildLocationActions(gameController.locations[currentGame.location]));
		};
	},
	
	buildContextualUseButtons: function(location) {
		var contextualUseNode = document.createElement('div');
		contextualUseNode.className = 'contextualUseNode';
		for (var item of currentGame.inventory) {
			var executeName,prettyName;
			if (typeof item == 'object') {
				executeName = 'use' + item.name.replace(/\s+/g,'');
				prettyName = item.name;
			} else {
				executeName = 'use' + item.replace(/\s+/g,'');
				prettyName = item;
			};
			if (location[executeName]) {
				contextualUseNode.appendChild(view.buildUseButton('Use '+prettyName,item));
			};
		};
		return contextualUseNode;
	},
	
	updateContextualUseButtons: function() {
		var currentDiv = document.getElementById('contrailFeedDiv').lastChild;
		var childDiv, contextualDiv;
		for (var n=0;n<currentDiv.children.length;n++) {
			childDiv = currentDiv.children[n];
			for (var i=0;i<childDiv.children.length;i++) {
				if (childDiv.children[i].className.indexOf('contextualUseNode') !== -1) {
					contextualDiv = childDiv.children[i];
				};
			};
		};
		if (contextualDiv) {
			contextualDiv.replaceWith(view.buildContextualUseButtons(gameController.locations[currentGame.location]));
		};
	},
	
	buildLocationContents: function(location) {
		var item, index;
		var contentsNode = document.createElement('div');
		contentsNode.className = 'contentsNode';
		var contentsArray = contrail.buildContentsArray(location);
		for (item of contentsArray) {
			var button = document.createElement('button');
			contentsNode.appendChild(button);
			button.addEventListener('click',contrail.pickupItem.bind(contrail,item));
			if (typeof item == 'string') {
				button.innerHTML = item;
			} else if (typeof item == 'object' && item.qty) {
				var plural = '';
				if (item.qty > 1 && item.plural) {
					plural = item.plural;
				} else if (item.qty > 1) {
					plural = 's';
				};
				button.innerHTML = item.qty + " " + item.name;
			} else if (typeof item == 'object') {
				button.innerHTML = item.name;
			};
		};
		return contentsNode;
	},
	
	updateLocationContents: function() {
		var currentDiv = document.getElementById('contrailFeedDiv').lastChild;
		var childDiv, contentsDiv;
		for (var n=0;n<currentDiv.children.length;n++) {
			childDiv = currentDiv.children[n];
			for (var i=0;i<childDiv.children.length;i++) {
				if (childDiv.children[i].className.indexOf('contentsNode') !== -1) {
					contentsDiv = childDiv.children[i];
				};
			};
		};
		if (contentsDiv == undefined) {
			for (var n=0;n<currentDiv.children.length;n++) {
				if (currentDiv.children[n].className.indexOf('contentsNode') !== -1) {
					contentsDiv = currentDiv.children[n];
				};
			};
		};
		if (contentsDiv) {
			contentsDiv.replaceWith(view.buildLocationContents(currentGame.location));
		};
	},
	
	buildLocationExits: function(location) {
		var exitNode = document.createElement('div');
		exitNode.className = 'exitsNode';
		for (var exitName in location.exits) {
			var exit = location.exits[exitName];
			if (exit.visible == undefined || currentGame.vars[exit.visible] == true) {
				var button = document.createElement('button');
				exitNode.appendChild(button);
				button.innerHTML = exit.label;
				button.addEventListener('click',contrail.useExit.bind(contrail,exit));
				if (gameController.locations[exit.destination] == undefined) {
					button.disabled = true;
				};
				if (contrail.getVar('globalExitLock') || (exit.unlockedBy !== undefined && (currentGame.vars == undefined || currentGame.vars[exit.unlockedBy] == undefined || currentGame.vars[exit.unlockedBy] == false) ) ) {
					button.className = 'lockedExit';
					button.style.backgroundColor = 'grey';
				};
			};
		};
		return exitNode
	},
	
	updateLocationExits: function() {
		var currentDiv = document.getElementById('contrailFeedDiv').lastChild;
		var childDiv, exitsDiv;
		for (var n=0;n<currentDiv.children.length;n++) {
			childDiv = currentDiv.children[n];
			for (var i=0;i<childDiv.children.length;i++) {
				if (childDiv.children[i].className.indexOf('exitsNode') !== -1) {
					exitsDiv = childDiv.children[i];
				};
			};
		};
		if (exitsDiv) {
			exitsDiv.replaceWith(view.buildLocationExits(gameController.locations[currentGame.location]));
		};
	},
	
	updatePortrait: function(node) {
		var contrailPortraitDiv = document.getElementById('contrailPortraitDiv');
		contrailPortraitDiv.innerHTML = '';
		if (node) {
			contrailPortraitDiv.appendChild(node);
		} else if (gameController.updatePortrait) {
			contrailPortraitDiv.appendChild(gameController.updatePortrait(node));
		} else if (currentGame.vars.body) {
			if (currentGame.vars.body instanceof MorfologyBody) {
			} else {
				var newBody = new MorfologyBody();
				newBody.id = currentGame.vars.body.id;
				newBody.biometrics = currentGame.vars.body.biometrics;
				newBody.coloring = currentGame.vars.body.coloring;
				newBody.garments = currentGame.vars.body.garments;
				newBody.pose = currentGame.vars.body.pose;
				currentGame.vars.body = newBody;
			};
			var portraitSVG = currentGame.vars.body.draw(500,750,'head');
			portraitSVG.className = 'portraitSVG';
			contrailPortraitDiv.appendChild(portraitSVG);
		};
	},
	
	updateStats: function(node) {
		var statsDiv = document.getElementById('contrailStatsDiv');
		statsDiv.innerHTML = '';
		if (node) {
			statsDiv.appendChild(node);
		} else if (gameController.updateStats) {
			statsDiv.appendChild(gameController.updateStats());
		} else {
			for (var statKey in gameController.statFormats) {
				if (currentGame.vars[statKey] !== undefined) {
					var format = gameController.statFormats[statKey];
					var string = '';
					string += format.name + ": ";
					string += currentGame.vars[statKey];
					if (typeof format.cap == 'number') {
						string += " / "+format.cap;
					} else if (typeof format.cap == 'string') {
						string += " / "+currentGame.vars[format.cap];
					};
					if (format.units) {
						string += format.units;
					};
					var p = document.createElement('p');
					p.innerHTML = string;
					statsDiv.appendChild(p);
				};
			};
		};
	},
	
	updateActions: function(node) {
		var gameActionsDiv = document.getElementById('gameActionsDiv');
		gameActionsDiv.innerHTML = '';
		if (node) {
			gameActionsDiv.appendChild(node);
		} else {
			if (currentGame && currentGame.location) {
				var lookBtn = document.createElement('button');
				lookBtn.innerHTML = "Look";
				gameActionsDiv.appendChild(lookBtn);
				lookBtn.addEventListener('click',view.displayLocation);
			};
			if (currentGame && currentGame.inventory) {
				var invBtn = document.createElement('button');
				invBtn.innerHTML = "Inventory";
				gameActionsDiv.appendChild(invBtn);
				invBtn.addEventListener('click',view.toggleInventory);
			};
			if (currentGame && (currentGame.time || currentGame.turns !== undefined) ) {
				var waitBtn = document.createElement('button');
				waitBtn.innerHTML = "Wait";
				gameActionsDiv.appendChild(waitBtn);
				waitBtn.addEventListener('click',contrail.wait);
			};
			if (gameController.customActions) {
				gameActionsDiv.appendChild(gameController.customActions());
			};
		};
		view.updateDefaultActions();
	},
	
	updateTime: function() {
		var timeDiv = document.getElementById('contrailTimeDiv');
		timeDiv.innerHTML = '';
		if (gameController.updateTime) {
			var customTime = gameController.updateTime();
			if (customTime instanceof HTMLElement) {
				timeDiv.appendChild(customTime);
			} else if (typeof customTime == 'string') {
				timeDiv.innerHTML = customTime;
			};
		} else if (currentGame) {
			var string = '';
			if (currentGame.location && gameController.locations[currentGame.location].name) {
				string += gameController.locations[currentGame.location].name;
			};
			if (string !== '') {string += " ~ "};
			if (currentGame && currentGame.time !== undefined) {
				if (gameController.timeFormat && gameController.timeFormat.year) {string += currentGame.time.getFullYear() + " "};
				if (gameController.timeFormat && gameController.timeFormat.month) {string += ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Nov","Dec"][currentGame.time.getMonth()] + " "};
				if (gameController.timeFormat && gameController.timeFormat.date) {string += currentGame.time.getDate() + " "};
				if (gameController.timeFormat && gameController.timeFormat.day) {string += ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][currentGame.time.getDay()] + " "};
				if (gameController.timeFormat && gameController.timeFormat.hour) {string += currentGame.time.getHours() + ":"};
				if (gameController.timeFormat && gameController.timeFormat.minute) {string += ("00" + currentGame.time.getMinutes()).slice(-2) + ":"};
				if (gameController.timeFormat && gameController.timeFormat.second) {string += ("00" + currentGame.time.getSeconds()).slice(-2) + " "};
			};
			if (string !== '') {string += " ~ "};
			if (gameController.timeFormat && gameController.timeFormat.turns !== undefined) {
				string += currentGame.turns + " Turn";
				if (currentGame.turns !== 1) {string += 's'};
			};
			timeDiv.innerHTML = string;
		};
	},
	
	updateMap: function(node) {
		var contrailMapDiv = document.getElementById('contrailMapDiv');
		contrailMapDiv.innerHTML = '';
		if (node) {
			contrailMapDiv.appendChild(node);
		} else {
			contrailMapDiv.appendChild(view.buildMap());
		};
	},
	
	buildMap: function() {
		var mapSVG = document.createElementNS('http://www.w3.org/2000/svg','svg');
		mapSVG.id = 'mapSVG';
		if (currentGame) {
			var viewBox;
			if (currentGame.location && gameController.locations[currentGame.location].map && gameController.locations[currentGame.location].map.x !== undefined && gameController.locations[currentGame.location].map.y !== undefined) {
				viewBox = (gameController.locations[currentGame.location].map.x-100) + ' ' + (gameController.locations[currentGame.location].map.y-100) + ' 200 200';
			} else {
				viewBox = '-100 -100 200 200';
			};
			mapSVG.setAttribute('viewBox',viewBox);
			mapSVG.setAttribute('xmlns',"http://www.w3.org/2000/svg");
			mapSVG.setAttribute('xmlns:xlink',"http://www.w3.org/1999/xlink");
		
			var defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
			defs.id = 'globalDefs';
			mapSVG.appendChild(defs);
		
			var exitsLayer = document.createElementNS('http://www.w3.org/2000/svg','g');
			exitsLayer.id = 'exitsLayer';
			mapSVG.appendChild(exitsLayer);
		
			var locationsLayer = document.createElementNS('http://www.w3.org/2000/svg','g');
			locationsLayer.id = 'locationsLayer';
			mapSVG.appendChild(locationsLayer);
		
			var tooltipLayer = document.createElementNS('http://www.w3.org/2000/svg','g');
			tooltipLayer.id = 'tooltipLayer';
			mapSVG.appendChild(tooltipLayer);
		
			if (currentGame.location && gameController.locations[currentGame.location].map && gameController.locations[currentGame.location].map.x !== undefined) {
				var youAreHere = document.createElementNS('http://www.w3.org/2000/svg','circle');
				mapSVG.appendChild(youAreHere);
				youAreHere.setAttribute('cx',gameController.locations[currentGame.location].map.x);
				youAreHere.setAttribute('cy',gameController.locations[currentGame.location].map.y);
				youAreHere.setAttribute('r',2);
				youAreHere.setAttribute('fill','red');
				youAreHere.setAttribute('stroke','black');
			};

			for (var location in currentGame.locations) {
				var details;
				if (currentGame.locations[location].map !== undefined) {
					details = currentGame.locations[location].map;
				} else {
					details = gameController.locations[location].map;
				};
				if (details) {
					var node;
					if (details.shape == 'square' || details.shape == 'rect' || details.shape == undefined ) {
						node = document.createElementNS('http://www.w3.org/2000/svg','rect');
						if (details.width) {
							node.setAttribute('width',details.width);
							node.setAttribute('x',details.x-details.width/2);
						} else {
							node.setAttribute('width',10);
							node.setAttribute('x',details.x-5);
						};
						if (details.height) {
							node.setAttribute('height',details.height);
							node.setAttribute('y',details.y-details.height/2);
						} else {
							node.setAttribute('height',10);
							node.setAttribute('y',details.y-5);
						};
					} else if (details.shape == 'round' || details.shape == 'circle' || details.shape == 'ellipse') {
						node = document.createElementNS('http://www.w3.org/2000/svg','ellipse');
						if (details.width) {
							node.setAttribute('rx',details.width/2);
						} else {
							node.setAttribute('rx',5);
						};
						if (details.height) {
							node.setAttribute('ry',details.height/2);
						} else {
							node.setAttribute('ry',5);
						};
						node.setAttribute('cx',details.x);
						node.setAttribute('cy',details.y);
					} else if (details.shape == 'polygon') {
						node = document.createElementNS('http://www.w3.org/2000/svg','polygon');
						node.setAttribute('points',details.points);
						node.setAttribute('transform','translate('+details.x+' '+details.y+')');
					} else if (details.shape == 'path') {
						node = document.createElementNS('http://www.w3.org/2000/svg','path');
						node.setAttribute('d',details.d);
						node.setAttribute('transform','translate('+details.x+' '+details.y+')');
					} else {
						console.log('cannot draw',details);
					};
					if (node) {
						if (details.fill) {
							node.setAttribute('fill',details.fill);
						} else {
							node.setAttribute('fill','grey');
						};
						if (details.stroke) {
							node.setAttribute('stroke',details.stroke);
						} else {
							node.setAttribute('stroke','white');
						};
						if (details.strokeWidth) {
							node.setAttribute('stroke-width',details.strokeWidth);
						};
						if (details.rotate) {
							node.setAttribute('transform','rotate('+details.rotate+' '+details.x+' '+details.y+' )');
						};
						if (gameController.locations[location].name) {
							node.addEventListener('mouseenter',view.displayTooltip.bind(view,gameController.locations[location].name));
							node.addEventListener('mouseleave',view.clearTooltip);
						};
						locationsLayer.appendChild(node);
					};
					for (var exitName in gameController.locations[location].exits) {
						var exit = gameController.locations[location].exits[exitName];
						if (exit.visible == undefined || currentGame.vars[exit.visible] == true) {
							var destination, exitNode = undefined;
							if (currentGame.locations[exit.destination] && currentGame.locations[exit.destination].map) {
								destination = currentGame.locations[exit.destination].map;
							} else if (gameController.locations[exit.destination]){
								destination = gameController.locations[exit.destination].map;
							};
							if (destination && exit.display !== 'none' && exit.display !== false) {
								exitNode = document.createElementNS('http://www.w3.org/2000/svg','line');
								if (exit.x1) {
									exitNode.setAttribute('x1',exit.x1);
								} else if (exit.dx1) {
									exitNode.setAttribute('x1',details.x + exit.dx1);
								} else {
									exitNode.setAttribute('x1',details.x);
								};
								if (exit.y1) {
									exitNode.setAttribute('y1',exit.y1);
								} else if (exit.dy1) {
									exitNode.setAttribute('y1',details.y + exit.dy1);
								} else {
									exitNode.setAttribute('y1',details.y);
								};
								if (exit.x2) {
									exitNode.setAttribute('x2',exit.x2);
								} else if (exit.dx2) {
									exitNode.setAttribute('x2',destination.x + exit.dx2);
								} else {
									exitNode.setAttribute('x2',destination.x);
								};
								if (exit.y2) {
									exitNode.setAttribute('y2',exit.y2);
								} else if (exit.dy2) {
									exitNode.setAttribute('y2',destination.y + exit.dy2);
								} else {
									exitNode.setAttribute('y2',destination.y);
								};
							};
							if (exitNode) {
								if (exit.stroke) {
									exitNode.setAttribute('stroke',exit.stroke);
								} else {
									exitNode.setAttribute('stroke','white');
								};
								if (exit.width) {
									exitNode.setAttribute('stroke-width',exit.width);
								} else {
									exitNode.setAttribute('stroke','white');
								};
								exitsLayer.appendChild(exitNode);
							};
						};
					};
				};
			};
		};
		
		return mapSVG;
	},
	
	displayTooltip: function(string) {
		var tooltip = document.createElementNS('http://www.w3.org/2000/svg','text');
		document.getElementById('tooltipLayer').appendChild(tooltip);
		tooltip.innerHTML = string;
		if (currentGame.location) {
			tooltip.setAttribute('x',gameController.locations[currentGame.location].map.x);
		};
		tooltip.setAttribute('y',80);
		tooltip.setAttribute('stroke','black');
		tooltip.setAttribute('stroke-width',6);
		tooltip.setAttribute('fill','white');
		tooltip.setAttribute('paint-order','stroke');
		tooltip.setAttribute('text-anchor','middle');
		tooltip.setAttribute('font-size',10);
	},
	
	clearTooltip: function() {
		var tooltipLayer = document.getElementById('tooltipLayer');
		tooltipLayer.innerHTML = '';
	},
	
	updateContextualDiv: function(node) {
		var contrailContextualDiv = document.getElementById('contrailContextualDiv');
		contrailContextualDiv.innerHTML = '';
		if (node) {
			contrailContextualDiv.appendChild(node);
		};
	},
	
	toggleInventory: function() {
		var inventoryNode = view.findInventory();
		if (inventoryNode) {
			inventoryNode.remove();
		} else {
			view.displayInventory();
		};
	},
	
	displayInventory: function() {
		if (gameController.displayInventory) {
			view.addToFeed(gameController.displayInventory(),true);
		} else {
			view.addToFeed(view.buildInventory(),true);
		};
	},
	
	findInventory: function() {
		var currentDiv = document.getElementById('contrailFeedDiv').lastChild;
		var inventoryNode;
		for (var n=0;n<currentDiv.children.length;n++) {
			if (currentDiv.children[n].className.indexOf('inventoryDiv') !== -1) {
				inventoryNode = currentDiv.children[n];
			};
		};
		return inventoryNode;
	},
	
	closeInventory: function() {
		var inventoryNode = view.findInventory();
		inventoryNode.remove();
	},
	
	updateInventory: function() {
		var inventoryDiv;
		if (gameController.displayInventory) {
			inventoryDiv = gameController.displayInventory();
		} else {
			inventoryDiv = view.buildInventory();
		};
		var inventoryNode = view.findInventory();
		if (inventoryNode) {
			inventoryNode.replaceWith(inventoryDiv);
		};
	},
	
	buildInventory: function() {
		var inventoryDiv = document.createElement('div');
		inventoryDiv.className = 'inventoryDiv';
		if (gameController.colors && gameController.colors.InventoryDivBackground) {
			inventoryDiv.style.background = gameController.colors.InventoryDivBackground;
		};
		if (gameController.colors && gameController.colors.InventoryDivText) {
			inventoryDiv.style.color = gameController.colors.InventoryDivText;
		};
		var inventoryHead = document.createElement('h4');
		inventoryDiv.appendChild(inventoryHead);
		inventoryHead.innerHTML = "Inventory";
		var closeButton = document.createElement('button');
		closeButton.innerHTML = 'X';
		closeButton.addEventListener('click',view.closeInventory);
		inventoryHead.appendChild(closeButton);
		var ul = document.createElement('ul');
		inventoryDiv.appendChild(ul);
		for (var item of currentGame.inventory) {
			var string = '';
			if (typeof item == 'string') {
				string = item;
			} else if (typeof item == 'object') {
				if (item.qty) {
					string += item.qty + " ";
				};
				string += item.name;
				if (item.qty && item.qty > 1 && item.plural == undefined) {
					string += "s";
				} else if (item.qty && item.qty > 1) {
					string += item.plural;
				};
			};
			if (string !== '') {
				var li = document.createElement('li');
				li.innerHTML = string;
				ul.appendChild(li);
				var customExamine = false;
				if (item.itemUses) {
					for (var useCase of item.itemUses) {
						if (useCase.label == 'Examine') {
							customExamine = true;
						};
					};
				};
				if (typeof item == 'object' && (item.desc || customExamine) ) {
					var examineBtn = document.createElement('button');
					examineBtn.innerHTML = 'Examine';
					li.appendChild(examineBtn);
					examineBtn.addEventListener('click',contrail.examineItem.bind(this,item));
				};
				if (currentGame.location && (typeof item !== 'object' || item.droppable == undefined || item.droppable)) {
					var dropBtn = document.createElement('button');
					dropBtn.innerHTML = 'Drop';
					li.appendChild(dropBtn);
					dropBtn.addEventListener('click',contrail.dropItem.bind(this,item,li));
				};
				if ( (typeof item == 'string' && gameController['use'+item.replace(/ /g,'')]) || (currentGame.location && typeof item == 'string' && gameController.locations[currentGame.location]['use'+item.replace(' ','')]) ) {
					var useBtn = document.createElement('button');
					useBtn.innerHTML = 'Use';
					li.appendChild(useBtn);
					useBtn.addEventListener('click',contrail.useItem.bind(this,item,undefined));
				};
				// list uses for objective items here
				if (typeof item == 'object' && item.itemUses) {
					for (var i in item.itemUses) {
						if (item.itemUses[i].label !== 'Examine') {
							var useBtn = document.createElement('button');
							useBtn.innerHTML = item.itemUses[i].label;
							li.appendChild(useBtn);
							useBtn.addEventListener('click',contrail.useItem.bind(this,item,i));
						};
					};
				};
			};
		};
		return inventoryDiv;
	},
	
	buildActionButton: function(action) {
		var label = action.label;
		var functionName = action.execute;
		var functionCall;
		if (gameController.locations && typeof gameController.locations[currentGame.location][functionName] == 'function') {
			functionCall = gameController.locations[currentGame.location][functionName];
		} else if (typeof gameController[functionName] == 'function') {
			functionCall = gameController[functionName];
		} else if (gameController.locations && gameController.locations[currentGame.location][functionName]) {
			functionCall = view.addToFeed(gameController[functionName],true);
		} else if (gameController[functionName] !== undefined) {
			functionCall = view.addToFeed(gameController[functionName],true);
		};
		var button = document.createElement('button');
		button.innerHTML = label;
		if (functionCall) {
			button.addEventListener('click',contrail.takeAction.bind(contrail,action,functionCall));
		} else {
			button.disabled = true;
			console.log('ERROR: cannot find the function "',functionName,'" for the ',label,' button');
		};
		return button;
	},
	
	buildMoveButton: function(label,destination) {
		var button = document.createElement('button');
		button.innerHTML = label;
		button.addEventListener('click',contrail.moveLocation.bind(contrail,destination));
		return button;
	},
	
	buildUseButton: function(label,item) {
		var button = document.createElement('button');
		button.innerHTML = label;
		button.addEventListener('click',contrail.useItem.bind(contrail,item,undefined));
		return button;
	},
	
	// Standard Shortcuts
	
	setHref: function(element,href,external) {
		var string = '#'+href;
		if (external) {
			string = href;
		};
		element.setAttribute('href',string);
		element.setAttributeNS('http://www.w3.org/1999/xlink','xlink:href',string);
	},
};

window.onresize = function(event) {view.windowResize();};

// Default Demo "Game"

var gameController = {
	title: 'Introduction to Contrail',
	byline: 'A text-based game format',
	savePrefix: 'contrail',
	
	supportURL: 'http://patreon.com/joshroby',
	supportLabel: 'Support Contrail!',
	
	launchEntry: [
		"Contrail is a code suite that allows you to make your own text-based games using JavaScript.",
		"This tutorial outlines how to create a game with Contrail.  Click on any of the light blue words below to learn more about that topic:",
		"[[The Guts|guts]] of your Contrail game are two JavaScript objects, <span class='codeSpan'>gameController</span> and <span class='codeSpan'>currentGame</span>.",
		"[[Panes|panes]] Contrail organizes your game content across a number of panes in the screen.",
		"[[Entries|entries]] Your game will present a series of entries, or chunks of content, displayed here on the main feed.",
		"[[Var Functions|varsDetails]] provide simple means to store and retrieve game state variables on <span class='codeSpan'>currentGame</span>.",
		"[[statFormats|statsDetails]] allow you to display chosen vars in the sidebar.",
		"[[Locations|locationsDetails]] You can organize your game into locations that allow the player to navigate between rooms, areas, and spaces.",
		"[[Mapping|mappingDetails]] provides a framework of coordinates and shapes that lets Contrail map locations as the player explores them.",
		"[[Inventory|inventoryDetails]] functions keep track of items in the player's inventory in two formats: simple and objective.",
		"[[Clock|clockDetails]] functions count turns and display a fictional time.",
	],
	
	returnToMain: function() {
		view.addToFeed('<hr>',true);
		gameController.colors = {
			TitleDivBackground: "black",
			TitleDivBorder: "none",
			TitleDivText: "white",
			PortraitDivBorder: 'none',
			StatsDivBorder: 'none',
			ActionsDivBorder: 'none',
			FeedDivBorder: 'none',
			TimeDivBorder: 'none',
			MapDivBorder: 'none',
			ContextualDivBorder: 'none',
		};
		view.updateColors();
		view.addToFeed(gameController.launchEntry);
	},
	
	guts: [
		"<h3>The Guts of Contrail</h3>",
		"Your contrail game will run on two objects, one of which you make, and one of which will be made as the player plays your game.",
		"[[gameController|gameControllerDetails]] The <span class='codeSpan'>gameController</span> object stores all the unchanging content of a game, such as what happens when you pull a lever or dance with a suitor.  When you create a game with Contrail, you will be creating a <span class='codeSpan'>gameController</span>.",
		"[[currentGame|currentGameDetails]] Each play of a contrail game creates a <span class='codeSpan'>currentGame</span> object to store the changeable content of a game, such as the number of levers pulled and suitors slapped.  This object is used to save a game to be continued later.",
		"Contrail's core code is in the <span class='codeSpan'>contrail</span> object, which you don't need to worry about.  You might call functions stored on it, though.",
		"[[Back to Main Menu|returnToMain]]"
	],
	
	gameControllerDetails: [
		"<h3>gameController</h3>",
		"The <span class='codeSpan'>gameController</span> is a JavaScript object defined in its own file, linked in the <span class='codeSpan'>index.html</span> file.  It will have loads of attributes on it, but let's start with the simplest.",
		"The <span class='codeSpan'>title</span> stores content that displays in the upper left hand corner of the screen.  The <span class='codeSpan'>title</span> of this default <span class='codeSpan'>gameController</span> is 'Introduction to Contrail.'",
		"The <span class='codeSpan'>byline</span> stores content displayed just under the title.  This is primarily intended for credits such as 'by Josh Roby' but can also be used for subtitles or other information in a pinch, as in the example here.",
		"Both <span class='codeSpan'>title</span> and <span class='codeSpan'>byline</span> can be simple strings, in which case they will be displayed as &lt;h1> and &lt;h3> heads, or they may be functions that return an HTML node.",
		"The first part of the gameController you are using right now looks like this:",
		{className:'codeBox',text:"var gameController = {"},
		{className:'codeBox indent1',text:"title: 'Introduction to Contrail',"},
		{className:'codeBox indent1',text:"byline: 'A text-based game format',"},
		{className:'codeBox indent1',text:"(some more stuff)"},
		{className:'codeBox',text:"}"},
		"(Find [[more information|creatingAndLinking]] on creating and linking a gameController file here.)",
		"<span class='codeSpan'>gameController</span>'s [[launchEntry|launchEntryDetails]] is the first thing your game will display here in the Feed.",
		"You can also [[set up a support link|setupSupportURL]] to your Patreon, Ko-Fi, Kickstarter or other outside website.",
		"[[Back to Main Menu|returnToMain]]"
	],
	
	creatingAndLinking: [
		"Creating a Javascript file is a straightforward and relatively simple process.",
		"<h4>Creating a JavaScript file</h4>",
		"You can use a simple text editor to create the file.  A full-featured word processor may also be used, but be careful to save the file as simple text.",
		"You can save the file with absolutely nothing in it, or just a couple spaces.",
		"Name the file <span class='codeSpan'>game.js</span>.  Save it in the same directory or folder as the <span class='codeSpan'>index.html</span> file you opened to see this page.",
		"<h4>Linking the Javascript file</h4>",
		"Now open the <span class='codeSpan'>index.html</span> file in the same text editor or word processor.",
		"You must add one line of HTML to link your JavaScript file to the <span class='codeSpan'>index.html</span> file.  Find the line that reads <span class='codeSpan'>&lt;script src='contrail.js'>&lt;/script></span>, near the top of the file.",
		"Add the line: <span class='codeSpan'>&lt;script src='gameController.js'>&lt;/script></span> right underneath it.",
		"Save the file.",
		"<h4>Done</h4>",
		"Now, when you Refresh this page, your browser will load the <span class='codeSpan'>gameController.js</span> file.",
		"Since that file is still empty, nothing will change.  Once you add a gameController object to the file, a Refresh will display your gameController instead of this tutorial.",
		"To display this tutorial again, simply remove the <span class='codeSpan'>&lt;script src='gameController.js'>&lt;/script></span> line from the <span class='codeSpan'>index.html</span> file.  Your gameController will remain unchanged; a Refresh will ignore that file until it is linked again.",
		"[[Back to Main Menu|returnToMain]]"
	],
	
	setupSupportURL: [
		"<h3>Support Link</h3>",
		"You can add a button to the sidebar that opens an outside webpage in a separate window.  This is especially useful for revenue sites like Patreon, Ko-Fi, or Kickstarter.",
		{className:'codeBox',text:"var gameController = {"},
		{className:'codeBox indent1',text:"..."},
		{className:'codeBox indent1',text:"supportURL: 'http://patreon.com/joshroby',"},
		{className:'codeBox indent1',text:"supportLabel: 'Support Contrail!',"},
		{className:'codeBox indent1',text:"..."},
		{className:'codeBox',text:"}"},
		"Defining <span class='codeSpan'>supportURL</span> on <span class='codeSpan'>gameController</span> makes the button appear.  This attribute should provide the URL for the site you want the button to open.",
		"The <span class='codeSpan'>supportLabel</span> is optional.  When set, it is used as the button label.  If it remains <span class='codeSpan'>undefined</span>, a default label will be used instead.",
		"[[Back to Main Menu|returnToMain]]"
	],
	
	colorsDetails: function() {
		gameController.colors = {
			TitleDivBackground: "blue",
			TitleDivBorder: "white",
			TitleDivText: "black",
			PortraitDivBorder: 'none',
			StatsDivBorder: 'none',
			ActionsDivBorder: 'none',
			FeedDivBorder: 'none',
			TimeDivBorder: 'none',
			MapDivBorder: 'none',
			ContextualDivBorder: 'none',
		};
		view.updateColors();
		var paragraphs = [
			'<h3>Colors</h3>',
			"The background color, border color, and text color of many of the elements on the screen can be set on <span class='codeSpan'>gameController</span>'s <span class='codeSpan'>colors</span> attribute.",
			{className:'codeBox',text:'var gameController = {'},
			{className:'codeBox indent1',text:'...'},
			{className:'codeBox indent1',text:'colors: {'},
			{className:'codeBox indent2',text:'TitleDivBackground: "blue"'},
			{className:'codeBox indent2',text:'TitleDivBorder: "white"'},
			{className:'codeBox indent2',text:'TitleDivText: "black"'},
			{className:'codeBox indent1',text:'},'},
			{className:'codeBox indent1',text:'...'},
			{className:'codeBox',text:'};'},
			"Elements that can be colored include: TitleDiv, PortraitDiv, StatsDiv, ActionsDiv, TimeDiv, MapDiv, ContextualDiv, FeedDiv, InventoryDiv.",
			"'Background' and 'Text' with no prefix will change the default colors for the entire display.",
			"The function <span class='codeSpan'>view.updateColors()</span> will update the colors once they are set.  If you set the colors on <span class='codeSpan'>gameController</span>, they will not update until this function is called.",
			"Colors may be any of the <a href='https://htmlcolorcodes.com/color-names/' target='htmlcolors'>HTML color names</a> or a hexcode.",
			"[[Back to Main Menu|returnToMain]]"
		];
		return paragraphs;
	},
	
	panes: function() {
		gameController.colors = {
			PortraitDivBorder: 'red',
			StatsDivBorder: 'orange',
			ActionsDivBorder: 'gold',
			FeedDivBorder: 'cyan',
			TimeDivBorder: 'green',
			MapDivBorder: 'blue',
			ContextualDivBorder: 'purple',
		};
		view.updateColors();
		var paragraphs = [
			'<h3>Panes</h3>',
			'Contrail divides the screen into a number of panes and displays different content in each.  Nearly all the panes are optional, and do not display when not in use.',
			"The TitlePane displays the game's title and byline.",
			"The [[PortraitPane|portraitPane]] (red) displays the player's portrait.",
			"The [[StatsPane|statsPane]] (orange) displays the player's visible stats.",
			"The [[ActionsPane|actionsPane]] (yellow) displays the actions available to the player, both in game ('Look' and 'Inventory') and out of game ('Save' and 'Load').",
			"The [[Feed Pane|feedPane]] (light blue) is the core of any Contrail game, displaying what is happening around the player.",
			"The [[Time Pane|timePane]] (green) displays the game's time, number of turns taken, and the player's current location.",
			"The [[Map Pane|mapPane]] (blue) displays a map of the game's locations, revealed as the player explores them.",
			"The [[Contextual Pane|contextualPane]] (purple) can display any additional information or interface that the game may require.",
			"All of the panes' coloring can be set with <span class='codeSpan'>gameController</span>'s [[colors|colorsDetails]] attribute.",
			"[[Back to Main Menu|returnToMain]]"
		];
		return paragraphs;
	},
	
	portraitPane: function() {
		gameController.colors = {
			PortraitDivBorder: 'red',
			StatsDivBorder: 'none',
			ActionsDivBorder: 'none',
			FeedDivBorder: 'none',
			TimeDivBorder: 'none',
			MapDivBorder: 'none',
			ContextualDivBorder: 'none',
		};
		view.updateColors();
		var paragraphs = [
			"<h3>Portrait Pane</h3>",
			"The portrait pane, to the left and outlined in red, is intended to display an image of the player's character.",
			"The function <span class='codeSpan'>contrail.updatePortrait(node)</span> will display the given node in that space.",
			"If <span class='codeSpan'>gameController.updatePortrait()</span> is defined, that function takes precedence.",
			"You can pass an &lt;img&gt; node linking to an external file, a generated svg, or even a &lt;div&gt; enclosing a text description.",
			"[[Back to Panes|panes]]",
			"[[Back to Main Menu|returnToMain]]"
		];
		return paragraphs;
	},
	
	statsPane: function() {
		gameController.colors = {
			PortraitDivBorder: 'none',
			StatsDivBorder: 'orange',
			ActionsDivBorder: 'none',
			FeedDivBorder: 'none',
			TimeDivBorder: 'none',
			MapDivBorder: 'none',
			ContextualDivBorder: 'none',
		};
		view.updateColors();
		var paragraphs = [
			"<h3>Stats Pane</h3>",
			"The stats pane, to the left and outlined in orange, displays the vars listed in <span class='codeSpan'>statFormats</span>.  For more information, see [[Stats|statsDetails]].",
			"The function <span class='codeSpan'>contrail.updateStats(node)</span> updates the stats display.  If passed a node, it will display that node as-is.  If passed no arguments, it will use the default stats display.",
			"If <span class='codeSpan'>gameController.updateStats()</span> is defined, that function takes precedence.",
			"[[Back to Panes|panes]]",
			"[[Back to Main Menu|returnToMain]]"
		];
		return paragraphs;
	},
	
	actionsPane: function() {
		gameController.colors = {
			PortraitDivBorder: 'none',
			StatsDivBorder: 'none',
			ActionsDivBorder: 'gold',
			FeedDivBorder: 'none',
			TimeDivBorder: 'none',
			MapDivBorder: 'none',
			ContextualDivBorder: 'none',
		};
		view.updateColors();
		var paragraphs = [
			"<h3>Actions Pane</h3>",
			"The actions pane, to the left and outlined in yellow, displays the actions available to the player.",
			"The function <span class='codeSpan'>contrail.updateActions(node)</span> updates the actions display.  If passed a node, it will display that node as-is.  If passed no arguments, it will use the default actions display.",
			"If <span class='codeSpan'>gameController.updateActions()</span> is defined, that function takes precedence.",
			"[[Back to Panes|panes]]",
			"[[Back to Main Menu|returnToMain]]"
		];
		return paragraphs;
	},
	
	feedPane: function() {
		gameController.colors = {
			PortraitDivBorder: 'none',
			StatsDivBorder: 'none',
			ActionsDivBorder: 'none',
			FeedDivBorder: 'cyan',
			TimeDivBorder: 'none',
			MapDivBorder: 'none',
			ContextualDivBorder: 'none',
		};
		view.updateColors();
		var paragraphs = [
			"<h3>The Feed Pane</h3>",
			"The Feed pane, presently outlined in light blue, is the core of a Contrail game, displaying what is happening around the player.",
			"As entries are displayed in the Feed, older entries are faded out but still visible by scrolling up.  The function <span class='codeSpan'>view.addToFeed(content,newEntry)</span> is used to add to the feed.  The content argument can be a string, an array of strings, or an HTML node.  If newEntry is <span class='codeSpan'>true</span>, content above the new content will be faded out.",
			"[[Back to Panes|panes]]",
			"[[Back to Main Menu|returnToMain]]"
		];
		return paragraphs;
	},
	
	timePane: function() {
		gameController.colors = {
			PortraitDivBorder: 'none',
			StatsDivBorder: 'none',
			ActionsDivBorder: 'none',
			FeedDivBorder: 'none',
			TimeDivBorder: 'green',
			MapDivBorder: 'none',
			ContextualDivBorder: 'none',
		};
		view.updateColors();
		var paragraphs = [
			"<h3>The Time Pane</h3>",
			"The Time pane can display the current time in the game, the number of turns played so far, the player's current location, or any combination thereof.",
			"The function <span class='codeSpan'>contrail.updateTime(node)</span> updates the time display.  If <span class='codeSpan'>gameController.updateTime()</span> is defined, that will be called and its result put into the time pane.  Otherwise, the function will use the default time display.",
			"If <span class='codeSpan'>gameController.updateTime()</span> is defined, that function takes precedence.",
			"For more information on formatting how time displays, see [[Clock|clockDetails]].",
			"[[Back to Panes|panes]]",
			"[[Back to Main Menu|returnToMain]]"
		];
		return paragraphs;
	},
	
	mapPane: function() {
		gameController.colors = {
			PortraitDivBorder: 'none',
			StatsDivBorder: 'none',
			ActionsDivBorder: 'none',
			FeedDivBorder: 'none',
			TimeDivBorder: 'none',
			MapDivBorder: 'blue',
			ContextualDivBorder: 'none',
		};
		view.updateColors();
		var paragraphs = [
			"<h3>The Map Pane</h3>",
			"The Map pane displays a map of the game.  This may be an image you create, or it can be generated by the Locations code.",
			"The function <span class='codeSpan'>contrail.updateMap(node)</span> updates the map display.  If passed a node, it will display that node as-is.  If passed no arguments, it will use the default mapping functions.",
			"If <span class='codeSpan'>gameController.updateMap()</span> is defined, that function takes precedence.",
			"For more information on the auto-generated map, see [[Mapping|mappingDetails]].",
			"[[Back to Panes|panes]]",
			"[[Back to Main Menu|returnToMain]]"
		];
		return paragraphs;
	},
	
	contextualPane: function() {
		gameController.colors = {
			PortraitDivBorder: 'none',
			StatsDivBorder: 'none',
			ActionsDivBorder: 'none',
			FeedDivBorder: 'none',
			TimeDivBorder: 'none',
			MapDivBorder: 'none',
			ContextualDivBorder: 'purple',
		};
		view.updateColors();
		var paragraphs = [
			"<h3>The Contextual Pane</h3>",
			"The Contextual pane is for any additional information or interface elements that your game requires.  It is primarily intended as a space for context-specific interfaces, like an in-game control panel the player finds or a cooking minigame only accessible while in a kitchen.",
			"The function <span class='codeSpan'>contrail.updateContextualDiv(node)</span> displays the given node in the Contextual Pane.  If no node is supplied, the function will clear the Pane.  There is no default contextual display.",
			"If <span class='codeSpan'>gameController.updateContextualDiv()</span> is defined, that function takes precedence.",
			"[[Back to Panes|panes]]",
			"[[Back to Main Menu|returnToMain]]"
		];
		return paragraphs;
	},
	
	launchEntryDetails: [
		"<h3>launchEntry</h3>",
		"The <span class='codeSpan'>launchEntry</span> is the first thing displayed when a player starts a new game.",
		"It may be a string, an array of strings, or a function that returns an HTML node.",
		"A single string will be converted into a single paragraph.",
		"An array of strings will be converted into a series of paragraphs.",
		"An HTML node will simply be used exactly as-is.",
		"[[Back to Main Menu|returnToMain]]"
	],
	
	entries: [
		'<h3>Entries</h3>',
		"Each entry is stored as an attribute on <span class='codeSpan'>gameController</span>.  An entry can be a string, an array of strings, or a function.",
		{className:'codeBox',text:"var gameController = {"},
		{className:'codeBox indent1',text:"..."},
		{className:'codeBox indent1',text:"anEntry: 'This entry is just a string.',"},
		{className:'codeBox indent1',text:"anotherEntry: ["},
		{className:'codeBox indent2',text:"anotherEntry: 'This entry'"},
		{className:'codeBox indent2',text:"anotherEntry: 'is an &lt;em&gt;array&lt;/em&gt;'"},
		{className:'codeBox indent2',text:"anotherEntry: 'of strings.'"},
		{className:'codeBox indent1',text:"],"},
		{className:'codeBox indent1',text:"yetAnotherEntry: function() {,"},
		{className:'codeBox indent2',text:"var newCount = contrail.getVar('count') + 1;"},
		{className:'codeBox indent2',text:"contrail.setVar('count',newCount);"},
		{className:'codeBox indent2',text:"return 'This entry has been seen '+newCount+' times.';"},
		{className:'codeBox indent1',text:"},"},
		{className:'codeBox indent1',text:"..."},
		{className:'codeBox',text:"}"},
		"A string will be displayed as a single paragraph.",
		"An array will be displayed as a series of paragraphs.  To apply CSS to those paragraphs, use a [[styling object|stylingObject]]",
		"A function might return a string, an array, or an HMTL node.  Alternately, the function can call <span class='codeSpan'>contrail.addToFeed(node,newEntry)</span> on its own.  If <span class='codeSpan'>newEntry</span> is set to <span class='codeSpan'>true</span>, content in the feed above the new node will be faded.",
		"Entries may include HTML markup, such as the &lt;em&gt; tag in the example above, or &lt;img&gt; tags to display images.",
		"Entries will often include [[links]] and [[substitutions]].",
		"[[Back to Main Menu|returnToMain]]"
	],
	
	stylingObject: [
		"<h3>Styling Objects</h3>",
		"A styling object replaces a string in an entry array with an object with two attributes: <span class='codeSpan'>className</span> and <span class='codeSpan'>text</span>.",
		{className:'codeBox',text:"var gameController = {"},
		{className:'codeBox indent1',text:"..."},
		{className:'codeBox indent1',text:"aBoxedEntry: ["},
		{className:'codeBox indent2',text:"{className:'codeBox',text:'This text goes in a box.'}"},
		{className:'codeBox indent1',text:"],"},
		{className:'codeBox indent1',text:"..."},
		{className:'codeBox',text:"}"},
		"What would have gone in the string goes in <span class='codeSpan'>text</span>.",
		"The contents of <span class='codeSpan'>className</span> are set as the &lt;p&gt; tag's class. You may apply multiple classes to the &lt;p&gt; tag by setting <span class='codeSpan'>className</span> to a space-separated list, like 'codeBox indent1 flashingRed'.",
		"In the example above, the &lt;p&gt; tag created will be of the class 'codeBox' and would get you this:",
		{className:'codeBox',text:'This text goes in a box.'},
		"[[Back to Main Menu|returnToMain]]",
	],
	
	links: function() {
		var paragraphs = [
			'<h3>Links</h3>',
			"Entries in string and array formats can include links that the player can click on to display other entries.",
			"A link is formatted like [[this]].  The 'this' will be displayed in cyan (by default) and clicking on it will display the entry named 'this' on <span class='codeSpan'>gameController</span>.",
			"You can also format a link like [[this|entryName]], which will show up as a cyan 'this' but when clicked will display the entry named 'entryName'.",
			"If a link is included that references an attribute that does not exist, the link will display as regular text.",
		];
		var div = document.createElement('div');
		for (var paragraph of paragraphs) {
			var p = document.createElement('p');
			p.innerHTML = paragraph;
			div.appendChild(p);
		};
		view.addToFeed(div,true);
		view.addToFeed("[[Back to Main Menu|returnToMain]]",false);
	},
	
	substitutions: [
		'<h3>Substitutions</h3>',
		'Entries may include substitution keys such as <span class="codeSpan">$thisIsAKey</span> which Contrail will substitute with a string when the entry is displayed.',
		"Contrail will look for the proper substitute first in <span class='codeSpan'>currentGame.vars</span>, then in <span class='codeSpan'>gameController</span>, and finally in Contrail's own default substitutions.",
		"Substitutions on <span class='codeSpan'>gameController</span> may be functions that return a string.",
		{className:'codeBox',text:"var gameController = {"},
		{className:'codeBox indent1',text:"..."},
		{className:'codeBox indent1',text:"subKey: function() {return 'Foo'},"},
		{className:'codeBox indent1',text:"otherSubKey: 'Bar',"},
		{className:'codeBox indent1',text:"entry: function() {"},
		{className:'codeBox indent2',text:"contrail.setVar('otherSubKey','Club');"},
		{className:'codeBox indent2',text:"var string = ['The kid cried $subKey when $theyKey weren't allowed in the $otherSubKey.'];"},
		{className:'codeBox indent2',text:"return string;"},
		{className:'codeBox indent1',text:"},"},
		{className:'codeBox indent1',text:"..."},
		{className:'codeBox',text:"}"},
		"When the above example is displayed, <span class='codeSpan'>$subKey</span> would be replaced with 'Foo' from <span class='codeSpan'>gameController</span>.  <span class='codeSpan'>$otherSubKey</span> would <em>not</em> be replaced with 'Bar' because <span class='codeSpan'>gameController</span>'s value is superseded by 'Club' in <span class='codeSpan'>currentGame.vars</span>.",
		"<span class='codeSpan'>$theyKey</span> would be replaced with whatever pronoun is presently loaded into contrail's [[default substitutions|defaultSubstitutions]].",
		"[[Back to Main Menu|returnToMain]]",
	],
	theyKey: '$they',
	themKey: '$them',
	theirKey: '$their',
	theirsKey: '$theirs',
	themselfKey: '$themself',
	theyCapKey: '$They',
	themCapKey: '$Them',
	theirCapKey: '$Their',
	theirsCapKey: '$Theirs',
	sKey: '$s',
	esKey: '$es',
	isAreKey: '$isAre',
	hasHaveKey: '$hasHave',
	switchToHimKey: '$switchToHim',
	switchToHerKey: '$switchToHer',
	switchToThemKey: '$switchToThem',
	switchToYouKey: '$switchToYou',
	switchToZirKey: '$switchToZir',
	they1Key: '$they1',
	they2Key: '$they2',
	they3Key: '$they3',
	they2CapKey: '$They2',
	s2Key: '$s2',
	their2Key: '$their2',
	switch1ToThemKey: '$switch1ToThem',
	switch2ToHerKey: '$switch2ToHer',
	switch3ToHimKey: '$switch3ToHim',
	
	defaultSubstitutions: [
		'<h3>Default Substitutions</h3>',
		"Contrail has a number of default substitutions that can be called with keys.  These defaults may be overwritten by attributes on the <span class='codeSpan'>gameController</span> or with [[variables|varsDetails]].",
		"The [[pronoun substitution keys|pronounSubstitutions]] allow you to swap pronouns and conjugate (most) following verbs to allow a single passage be used by multiple characters of various genders.",
		"The [[time substitution keys|timeSubstitutions]] can access the game's [[clock|clockDetails]], if it is being used.",
		"[[Back to Main Menu|returnToMain]]",
	],
	
	pronounSubstitutions: [
		"<h3>Pronoun Substitution Keys</h3>",
		"The substitution keys $theyKey, $themKey, $theirKey, $theirsKey, $themselfKey, $sKey, $esKey, $isAreKey, and $hasHaveKey will be replaced with pronouns or conjugations that match them.  Capitalized pronoun keys will be replaced with capitalized pronouns.",
		"Pronoun substitution keys default to 'they' and 'them' and so on, but can be changed with the substitution keys $switchToHimKey, $switchToHerKey, $switchToThemKey, $switchToZirKey, and $switchToYouKey.  These keys are not replaced with anything when displayed; they only change the behavior of the other keys moving forward.",
		"When dealing with multiple persons, you may use the keys $they1Key, $they2Key, $they3Key and so on, and switch with $switch1ToThemKey, $switch2ToHerKey, $switch3ToHimKey, and so on.",
		{className:'codeBox',text:"'$switch2ToHerKey$they2CapKey walk$s2Key down $their2Key street to meet $themKey for coffee.  $theyCapKey $hasHaveKey already nabbed some seats.'"},
		"The above would display as 'She walks down her street to meet them for coffee.  They have already nabbed some seats.'",
		"You may also [[add your own pronoun sets|addingPronouns]].",
		"[[Back to Main Menu|returnToMain]]",
	],
	
	addingPronouns: [
		"<h3>Adding Pronoun Sets</h3>",
		"Additional pronoun sets may be stored on <span class='codeSpan'>gameController</span> as an object like so:",
		{className:'codeBox',text:"var gameController = {"},
		{className:'codeBox indent1',text:"..."},
		{className:'codeBox indent1',text:"pronounSets: {"},
		{className:'codeBox indent2',text:"pronounsFae: {"},
		{className:'codeBox indent3',text:"they: 'fae',"},
		{className:'codeBox indent3',text:"them: 'faer',"},
		{className:'codeBox indent3',text:"..."},
		{className:'codeBox indent2',text:"},"},
		{className:'codeBox indent1',text:"},"},
		{className:'codeBox indent1',text:"switchToFae: function() {contrail.switchPronounSet(1,'pronounsFae')}"},
		{className:'codeBox indent1',text:"switch1ToFae: function() {contrail.switchPronounSet(1,'pronounsFae')}"},
		{className:'codeBox indent1',text:"switch2ToFae: function() {contrail.switchPronounSet(2,'pronounsFae')}"},
		{className:'codeBox indent1',text:"..."},
		{className:'codeBox',text:"}"},
		"A pronoun set should include entries for they, them, their, theirs, themself, and the capitalized versions of each, plus s, es, isAre, and hasHave.  Any missing entries will default to using entries from the 'they' set.",
		"Substitution keys for switching pronoun sets call the <span class='codeSpan'>contrail.switchPronounSet()</span> function.  Be sure to include a substitution key with no index number in the key itself (ie 'switchToFae' as well as 'switch1ToFae') for ease of use.",
		"[[Back to Main Menu|returnToMain]]",
	],
	
	timeKey: '$time',
	milTimeKey: '$milTime',
	dateKey: '$date',
	dateNumKey: '$dateNum',
	dateNumMDYKey: '$dateNumMDY',
	dayOfWeekKey: '$dayOfWeek',
	timeOfDayKey: '$timeOfDay',
	seasonOfYearKey: '$seasonOfYear',
	timeSubstitutions: function() {
		gameController.setupClock();
		var array = [
			"<h3>Time Substitutions</h3>",
			"The time substitutions access the game's [[clock|clockDetails]].  If the clock is not being used, the key is not replaced.",
			"$timeKey is replaced with the time in hours and minutes: 5:23pm.",
			"$milTimeKey is replaced with the time in military format: 17:23.",
			"$dateKey is replaced with the date in month and day format: May 23rd.",
			"$dateNumKey is replaced with the date in numerical format: 23/5/2019.",
			"$dateNumMDYKey is replaced with the date in month-day-year numerical format: 5/23/2019.",
			"$dayOfWeekKey is replaced with the day of the week: Friday.",
// 			"$timeOfDayKey is replaced with a description of the time of the day: evening.",
// 			"$seasonOfYearKey is replaced with the current astronomical season: spring.",
			"[[Back to Main Menu|clearClock]]",
		];
		return array;
	},
	
	currentGameDetails: [
		'<h3>currentGame</h3>',
		"The <span class='codeSpan'>currentGame</span> object is automatically created when the player starts a new game.  It stores all of the game state variables used in play.  This default object will work for most games, but highly complicated games may need to modify or replace the global object.",
		"The <span class='codeSpan'>currentGame</span> object can be accessed directly through the global variable of the same name.  However, the [[Var Functions|varsDetails]] will access the data object safely.",
		"<h3>Saving and Loading</h3>",
		"Likewise, the save and load functions will work out of the box for most games.  The only restriction is that game saves may not include executable code or objects built with constructors.",
		"If your game relies on constructors or executable code in the game state object, you can add <span class='codeSpan'>serializeGame</span> and <span class='codeSpan'>loadGame</span> functions to the <span class='codeSpan'>gameController</span>.  These will be called when the save and load buttons are clicked.  <span class='codeSpan'>serializeGame</span> must return a string and <span class='codeSpan'>loadGame</span> must take that string as an argument in creating a functional <span class='codeSpan'>currentGame</span>.",
		"To disabled game saves entirely, set <span class='codeSpan'>gameController</span>'s <span class='codeSpan'>savesDisabled</span> attribute to <span class='codeSpan'>true</span>.",
		"[[Back to Main Menu|returnToMain]]",
	],
	
	varsDetails: [
		"<h3>Var Functions</h3>",
		"The Var functions allow quick and easy access to the variables stored on <span class='codeSpan'>currentGame</span>.",
		"Variables may be numbers, strings, or even arrays and objects.",
		"<span class='codeSpan'>contrail.setVar(variableKey,value)</span> sets the variable named variableKey to value.",
		"<span class='codeSpan'>contrail.getVar(variableKey)</span> returns the variable named variableKey.",
		"<span class='codeSpan'>contrail.modifyVar(variableKey,value)</span> sets the variable named variableKey to value, or if value is prepended with a '+' or '-', increases or decreases the variable.",
		"<span class='codeSpan'>contrail.rollVar(variableKey)</span> returns a random number between 0 and the value of the variable named variableKey.",
		"[[Stats|statsDetails]] are vars that display on the left side of the screen.",
		"[[Back to Main Menu|returnToMain]]",
	],
	
	statsDetails: function() {
		if (currentGame == undefined) {currentGame = {}};
		contrail.setVar('pizazz','Incredible');
		contrail.setVar('pluck',2);
		contrail.setVar('moxie',3);
		contrail.setVar('moxieMax',10);
		contrail.setVar('starPower',3);
		gameController.statFormats = {
			pizazz: {name: "Pizazz"},
			pluck: {name: "Pluck",cap:5},
			moxie: {name: "Moxie",cap:'moxieMax'},
			starPower: {name: "Star Power",units:'pts'},
		},
		view.updateStats();
		var paragraphs = [
			"<h3>Stat Formatting</h3>",
			"All variables are by default hidden.  If a variableKey is listed in the <span class='codeSpan'>statFormats</span> object on the <span class='codeSpan'>gameController</span>, they will be displayed in the Stats pane section of the screen.",
			"Here is an example <span class='codeSpan'>statFormats</span> object, with its result displayed at left.",
			{className:'codeBox',text:"var gameController = {"},
			{className:'codeBox indent1',text:"..."},
			{className:'codeBox indent1',text:"statFormats = {"},
			{className:'codeBox indent2',text:'pizazz: {name: "Pizazz"},'},
			{className:'codeBox indent2',text:'pluck: {name: "Pluck",cap:5},'},
			{className:'codeBox indent2',text:'moxie: {name: "Moxie",cap:"moxieMax"},'},
			{className:'codeBox indent2',text:'starPower: {name: "Star Power",units:"pts"},'},
			{className:'codeBox indent1',text:"},"},
			{className:'codeBox indent1',text:"..."},
			{className:'codeBox',text:"};"},
			"In this example, the variable <span class='codeSpan'>moxieMax</span> is set to 10.  Since <span class='codeSpan'>moxieMax</span> does not have its own entry in <span class='codeSpan'>statFormats</span>, it is displayed only as the cap for <span class='codeSpan'>moxie</span>.",
			"If a variable has a format defined in <span class='codeSpan'>statFormats</span> but is <span class='codeSpan'>undefined</span>, it will not display in the Stats pane.",
			"[[Back to Main Menu|clearStats]]"
		];
		view.addToFeed(paragraphs,true);
	},
	
	clearStats: function() {
		gameController.statFormats = {};
		view.updateStats();
		gameController.returnToMain();
	},
	
	locationsDetails: function() {
		if (currentGame == undefined) {currentGame = {}};
		contrail.moveLocation('locationsStart');
	},
	
	mappingDetails: function() {
		if (currentGame == undefined) {currentGame = {}};
		contrail.moveLocation('mappingDetails');
	},
	
	locations: {
	
		locationsStart: {
			name: "Locations",
			desc: [
				'Locations are objects that define rooms, areas, and spaces in your game.  These location objects go in the <span class="codeSpan">locations</span> object on <span class="codeSpan">gameController</span>.',
				"The player's current location is stored at <span class='codeSpan'>currentGame.location</span>.  Whenever that is defined, the 'Look' button will display at left, allowing the player to take a look at their surroundings.",
				{className:'codeBox',text:'var gameController = {'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox indent1',text:'locations: {'},
				{className:'codeBox indent2',text:'smallMeadow: {'},
				{className:'codeBox indent3',text:'name: "Small Meadow",'},
				{className:'codeBox indent3',text:'desc: "A pleasant, if small, meadow.",'},
				{className:'codeBox indent2',text:'},'},
				{className:'codeBox indent1',text:'},'},
				{className:'codeBox indent1',text:'startLocation: "smallMeadow",'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox',text:'};'},
				"Each location needs a unique key (in the example above, 'smallMeadow').",
				'If you set the <span class="codeSpan">startLocation</span> on <span class="codeSpan">gameController</span>, all new games will immediately start in that location and display that location in the Feed.',
				'Using Locations is optional.  Entire games can be created in Contrail without using locations at all.  You can also use locations for only part of your game (like this tutorial).',
				'Locations with exits will display a button for each exit at the bottom of the feed, like so:',
			],
			exits: {
				locDeets: {label:'Location Details',destination:'locationDetails'},
				exDeets: {label:'Exit Details',destination:'exitDetails'},
				actions: {label:'Location Actions',destination:'locationActions'},
				mapDeets: {label:'Mapping',destination:'mappingDetails'},
				back: {label:'Back to Main Menu',destination:'returnToMain'}
			},
		},
		
		returnToMain: {
			desc: function() {
				currentGame = undefined;
				view.updateMap();
				view.addToFeed(gameController.launchEntry);
			},
		},
		
		locationDetails: {
			name: "Location Details",
			desc: [
				"Locations need a <span class='codeSpan'>name</span> and a <span class='codeSpan'>desc</span>.",
				{className:'codeBox',text:'var gameController = {'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox indent1',text:'locations: {'},
				{className:'codeBox indent2',text:'smallMeadow: {'},
				{className:'codeBox indent3',text:'name: "Small Meadow",'},
				{className:'codeBox indent3',text:'desc: "A pleasant, if small, meadow.",'},
				{className:'codeBox indent2',text:'},'},
				{className:'codeBox indent1',text:'},'},
				{className:'codeBox indent1',text:'startLocation: "smallMeadow",'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox',text:'};'},
				"The location's <span class='codeSpan'>name</span> is displayed in the feed as an &lt;h3&gt; with the CSS class 'locationNameHead'.  The location's <span class='codeSpan'>name</span> is also displayed in the upper right corner.  While each location's key must be unique, <span class='codeSpan'>name</span>s can be identical for when you need to confuse your players.",
				"The location's <span class='codeSpan'>desc</span> (short for description) is displayed under its name in the Feed.  You can set this as a string (displayed as a paragraph), an array of strings (a series of paragraphs), or a function that returns an HTML node (displayed as-is).",
				"The location's <span class='codeSpan'>desc</span> can include [[links|locationLink]], to allow the player to look closer or interact with things without moving to another location.",
			],
			exits: {
				locHub: {label:'Back to Locations Hub',destination:'locationsStart'},
				back: {label:'Back to Main Menu',destination:'returnToMain'}
			},
			locationLink: [
				"Links may reference an attribute stored on the location or an attribute on <span class='codeSpan'>gameController</span>.  If there is an attribute of that name in both places, the location-specific attribute takes precedence.",
				{className:'codeBox',text:'var gameController = {'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox indent1',text:'locations: {'},
				{className:'codeBox indent2',text:'smallMeadow: {'},
				{className:'codeBox indent3',text:'...'},
				{className:'codeBox indent3',text:'smellFlowers: "These flowers are honeysuckles.",'},
				{className:'codeBox indent2',text:'},'},
				{className:'codeBox indent1',text:'},'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox',text:'};'},
				"Links display underneath the location and its buttons as a continuation of the location's entry in the feed.  Location buttons are not faded out.",
				"If a single link or a succession of links scroll the location buttons off the top of the feed, the player can scroll back up or click on the 'Look' button at left to get the Location buttons again.",
			],
		},
		
		exitDetails: {
			name: "Exit Details",
			desc: [
				"Exits are defined as objects in a location's <span class='codeSpan'>exits</span> object.",
				"Exits need a unique key, a <span class='codeSpan'>label</span>, and a <span class='codeSpan'>destination</span>.",
				{className:'codeBox',text:'var gameController = {'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox indent1',text:'locations: {'},
				{className:'codeBox indent2',text:'smallMeadow: {'},
				{className:'codeBox indent3',text:'...'},
				{className:'codeBox indent3',text:'exits: {'},
				{className:'codeBox indent4',text:'northPath: {'},
				{className:'codeBox indent5',text:'label:"North Path",'},
				{className:'codeBox indent5',text:'destination:"scenicHilltop",'},
				{className:'codeBox indent5',text:'transition:"You hike up the north path.",'},
				{className:'codeBox indent4',text:'},'},
				{className:'codeBox indent3',text:'},'},
				{className:'codeBox indent2',text:'},'},
				{className:'codeBox indent1',text:'},'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox',text:'};'},
				"The <span class='codeSpan'>label</span> is displayed on the exit button.  Unlike the key, it need not be unique.",
				"The <span class='codeSpan'>destination</span> is the location key where the exit leads.  If there is no such location defined, the button will display as disabled.",
				"You may also add a <span class='codeSpan'>transition</span> message, which will display in the feed just before the destination location.  If this is not defined, a default transition will display, instead.",
			],
			exits: {
				lockingExits: {label:'Hiding and Locking Exits',destination:'lockingExits'},
				exitFunctions: {label:'Exit Functions',destination:'exitFunctions'},
				exitMap: {label:'Exit Mapping',destination:'mappingExits'},
				locHub: {label:'Back to Locations Hub',destination:'locationsStart'},
				back: {label:'Back to Main Menu',destination:'returnToMain'}
			},
		},
		
		lockingExits: {
			name: 'Hiding and Locking Exits',
			desc: [
				"By default, exits are visible and unlocked and the player may pass through them.",
				{className:'codeBox',text:'var gameController = {'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox indent1',text:'locations: {'},
				{className:'codeBox indent2',text:'smallMeadow: {'},
				{className:'codeBox indent3',text:'...'},
				{className:'codeBox indent3',text:'exits: {'},
				{className:'codeBox indent4',text:'gardenGate: {'},
				{className:'codeBox indent5',text:'label:"Garden Gate",'},
				{className:'codeBox indent5',text:'destination:"garden",'},
				{className:'codeBox indent5',text:'visible:"gateRevealed",'},
				{className:'codeBox indent5',text:'unlockedBy:"gateUnlocked",'},
				{className:'codeBox indent5',text:"lockMessage:'The gate is locked!',"},
				{className:'codeBox indent4',text:'},'},
				{className:'codeBox indent3',text:'},'},
				{className:'codeBox indent2',text:'},'},
				{className:'codeBox indent1',text:'},'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox',text:'};'},
				"If an exit has a <span class='codeSpan'>visible</span> attribute, the exit will not display while that game variable is set to anything other than <span class='codeSpan'>true</span>.",
				"If an exit has a <span class='codeSpan'>unlockedBy</span> attribute, the exit is unpassable while that game variable is set to anything other than <span class='codeSpan'>true</span>.  The exit's button will still appear in the location's description.  Clicking on it will return the <span class='codeSpan'>lockMessage</span> or a default lock message.",
				"If the variable <span class='codeSpan'>globalExitLock</span> is set, all exits will be locked.  If the variable is set to anything other than <span class='codeSpan'>true</span>, the variable will be displayed as the lock message.",
			],
			exits: {
				exitDeets: {label:'Exit Details',destination:'exitDetails'},
				locked: {label:'Example Locked Exit',destination:'exitDetails',unlockedBy:'booboorooboo',lockMessage:"This exit is locked and displays this message when you click on it."},
			},
		},
		
		exitFunctions: {
			name: "Exit Functions",
			desc: [
				"You can name functions to be called when an exit is taken.",
				"You can name a function defined on the same room or a global function set on <span class='codeSpan'>gameController</span>.  Local functions take precedence over global functions.",
				{className:'codeBox',text:'var gameController = {'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox indent1',text:'locations: {'},
				{className:'codeBox indent2',text:'smallMeadow: {'},
				{className:'codeBox indent3',text:'...'},
				{className:'codeBox indent3',text:'exits: {'},
				{className:'codeBox indent4',text:'thornyPath: {'},
				{className:'codeBox indent5',text:'label:"Thorny Path",'},
				{className:'codeBox indent5',text:'destination:"scenicHilltop",'},
				{className:'codeBox indent5',text:'transition:"You push your way through the thorns.",'},
				{className:'codeBox indent5',text:'execute:"thornDamage",'},
				{className:'codeBox indent4',text:'},'},
				{className:'codeBox indent3',text:'},'},
				{className:'codeBox indent3',text:'thornDamage: function() {,'},
				{className:'codeBox indent4',text:'contrail.setVar("health",-1);'},
				{className:'codeBox indent3',text:'},'},
				{className:'codeBox indent2',text:'},'},
				{className:'codeBox indent1',text:'},'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox',text:'};'},
				"Anything added to the Feed will display <em>after</em> the exit's transition message and the new room's description and buttons.",
			],
			exits: {
				exitDeets: {label:'Exit Details',destination:'exitDetails'},
			},
		},
		
		locationActions: {
			name: 'Location Actions',
			desc: [
				"Interactive elements can be added to a location's <span class='codeSpan'>actions</span> object to create a button.",
				{className:'codeBox',text:'var gameController = {'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox indent1',text:'locations: {'},
				{className:'codeBox indent2',text:'smallMeadow: {'},
				{className:'codeBox indent3',text:'...'},
				{className:'codeBox indent3',text:'actions: {'},
				{className:'codeBox indent4',text:'pullLever: {'},
				{className:'codeBox indent5',text:'label:"Pull Lever",'},
				{className:'codeBox indent5',text:'visible:"leverUncovered",'},
				{className:'codeBox indent5',text:'execute:"pullLever",'},
				{className:'codeBox indent4',text:'},'},
				{className:'codeBox indent3',text:'},'},
				{className:'codeBox indent3',text:'pullLever: function() {'},
				{className:'codeBox indent4',text:'view.addToFeed("You pull the lever..."),'},
				{className:'codeBox indent4',text:'contrail.setVar("gateRevealed"),'},
				{className:'codeBox indent3',text:'},'},
				{className:'codeBox indent2',text:'},'},
				{className:'codeBox indent1',text:'},'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox',text:'};'},
				"The button's text will be the action's defined <span class='codeSpan'>label</span>, and clicking the button will call the <span class='codeSpan'>execute</span> function on the location object.",
				"Location actions are visible by default.  If an action has a <span class='codeSpan'>visible</span> attribute, the action's button will not display while that game variable is set to anything other than <span class='codeSpan'>true</span>.",
			],
			actions: {
				pullLever: {label:'Pull Lever',execute:'pullLever'},
			},
			exits: {
				locHub: {label:'Back to Locations Hub',destination:'locationsStart'},
				back: {label:'Back to Main Menu',destination:'returnToMain'}
			},
			pullLever: function() {
				view.addToFeed("You pull the lever, shooting of a wild display of fireworks to celebrate you learning how to set up actions in locations.");
			},
		},
	
		mappingDetails: {
			name: "Mapping Details",
			desc: [
				"Adding a <span class='codeSpan'>map</span> object in a location and loading it up with a few details will display that location and its exits on the map in the upper right corner of the screen.",
				{className:'codeBox',text:'var gameController = {'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox indent1',text:'locations: {'},
				{className:'codeBox indent2',text:'smallMeadow: {'},
				{className:'codeBox indent3',text:'...'},
				{className:'codeBox indent3',text:'map: {'},
				{className:'codeBox indent4',text:'x: 2,'},
				{className:'codeBox indent4',text:'y: 6,'},
				{className:'codeBox indent4',text:'},'},
				{className:'codeBox indent3',text:'},'},
				{className:'codeBox indent2',text:'},'},
				{className:'codeBox indent1',text:'},'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox',text:'};'},
				"The <span class='codeSpan'>map</span> object requires an <span class='codeSpan'>x</span> and a <span class='codeSpan'>y</span>, which define the center of the location.",
				"The map in the corner is 200 x 200, and always centers on the location defined by <span class='codeSpan'>currentGame.location</span>.  Positioning the mouse over any location will display that location's name.",
			],
			exits: {
				colors: {label:'Location Colors',destination:'locationColors'},
				shapes: {label:'Location Shapes',destination:'locationShapes'},
				styles: {label:'Mapping Exits',destination:'mappingExits'},
				reveal: {label:'Revealing Locations',destination:'revealingLocations'},
				back: {label:'Back to Main Menu',destination:'returnToMain'}
			},
			map: {
				x: 2,
				y: 6,
				height: 10,
				width: 10,
			},
		},
		
		locationColors: {
			name: "Location Colors",
			desc: [
				"You can define the <span class='codeSpan'>fill</span> and <span class='codeSpan'>stroke</span> of a location to add color to the map.",
				{className:'codeBox',text:'var gameController = {'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox indent1',text:'locations: {'},
				{className:'codeBox indent2',text:'locationColors: {'},
				{className:'codeBox indent3',text:'...'},
				{className:'codeBox indent3',text:'map: {'},
				{className:'codeBox indent4',text:'x: 2,'},
				{className:'codeBox indent4',text:'y: -10,'},
				{className:'codeBox indent4',text:'fill: "green",'},
				{className:'codeBox indent4',text:'stroke: "#FF0",'},
				{className:'codeBox indent4',text:'strokeWidth: 2,'},
				{className:'codeBox indent4',text:'},'},
				{className:'codeBox indent3',text:'},'},
				{className:'codeBox indent2',text:'},'},
				{className:'codeBox indent1',text:'},'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox',text:'};'},
				"The <span class='codeSpan'>fill</span> attribute defines what color is used to fill in the location's shape.",
				"The <span class='codeSpan'>stroke</span> attribute defines what color is used to draw the line around the location.",
				"Both <span class='codeSpan'>fill</span> and <span class='codeSpan'>stroke</span> can be an <a href='https://htmlcolorcodes.com/color-names/' target='htmlcolors'>HTML color name</a>, a hexcode, or 'none'.",
				"The <span class='codeSpan'>strokeWidth</span> attribute defines the width of the line around the location.",
			],
			exits: {
				shapes: {label:'Location Shapes',destination:'locationShapes'},
				exitColors: {label:'Exit Colors',destination:'exitColors',stroke:'cyan',width:8},
				deets: {label:'Back to Mapping Details',destination:'mappingDetails'},
				back: {label:'Back to Main Menu',destination:'returnToMain'}
			},
			map: {
				x: 2,
				y: -10,
				fill: 'green',
				stroke: 'yellow',
				strokeWidth: 2,
			},
		},
		
		locationShapes: {
			name: "Location Shapes",
			desc: [
				"By default, locations display as 10x10 rectangles.  You can set a different size by defining the location's <span class='codeSpan'>width</span> and <span class='codeSpan'>height</span>.",
				{className:'codeBox',text:'var gameController = {'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox indent1',text:'locations: {'},
				{className:'codeBox indent2',text:'locationShapes: {'},
				{className:'codeBox indent3',text:'...'},
				{className:'codeBox indent3',text:'map: {'},
				{className:'codeBox indent4',text:'x: -17,'},
				{className:'codeBox indent4',text:'y: 6,'},
				{className:'codeBox indent4',text:'height: 20,'},
				{className:'codeBox indent4',text:'},'},
				{className:'codeBox indent3',text:'},'},
				{className:'codeBox indent2',text:'},'},
				{className:'codeBox indent1',text:'},'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox',text:'};'},
				"You can set just <span class='codeSpan'>width</span> or just <span class='codeSpan'>height</span>, or both, or neither.",
			],
			exits: {
				round: {label:'Rounds',destination:'round'},
				polygon: {label:'Polygons',destination:'polygon'},
				paths: {label:'Paths',destination:'path'},
				colors: {label:'Location Colors',destination:'locationColors'},
				deets: {label:'Back to Mapping Details',destination:'mappingDetails'},
				back: {label:'Back to Main Menu',destination:'returnToMain'}
			},
			map: {
				x: -17,
				y: 6,
				height: 20,
			},
		},
		
		revealingLocations: {
			name: "Revealing Locations",
			desc: function() {
				contrail.initLocation('farOffLocation');
				var array = [
					"Normally, locations are added to the map as the player visits them.",
					"You can reveal a location on the map before the player gets there by calling the function <span class='codeSpan'>contrail.initLocation(locationKey)</span>.",
				];
				return view.arrayToDiv(array);
			},
			exits: {
				deets: {label:'Back to Mapping Details',destination:'mappingDetails'},
			},
			map: {
				x: 2,
				y: 22,
			},
		},
		
		farOffLocation: {
			name: "Far-Off Location",
			map: {
				x: 12,
				y: 40,
				fill: 'gold',
				stroke: 'red',
			},
		},
		
		round: {
			name: "Round-shaped Locations",
			desc: [
				"If you set the <span class='codeSpan'>shape</span> to 'round', you'll get a round location.",
				{className:'codeBox',text:'var gameController = {'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox indent1',text:'locations: {'},
				{className:'codeBox indent2',text:'roundLocations: {'},
				{className:'codeBox indent3',text:'...'},
				{className:'codeBox indent3',text:'map: {'},
				{className:'codeBox indent4',text:'x: -35,'},
				{className:'codeBox indent4',text:'y: -14,'},
				{className:'codeBox indent4',text:'shape: "round",'},
				{className:'codeBox indent4',text:'width: 15,'},
				{className:'codeBox indent4',text:'},'},
				{className:'codeBox indent3',text:'},'},
				{className:'codeBox indent2',text:'},'},
				{className:'codeBox indent1',text:'},'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox',text:'};'},
				"Round locations can also come in different sizes.  You can set just <span class='codeSpan'>width</span> or just <span class='codeSpan'>height</span>, or both, or neither.",
				"Without setting <span class='codeSpan'>width</span> or <span class='codeSpan'>height</span>, you'll get a circle with a diameter of 10.",
				"If you set <span class='codeSpan'>width</span> and <span class='codeSpan'>height</span> to different numbers (or define just one), you'll get an ellipse.",
			],
			exits: {
				polygon: {label:'Polygons',destination:'polygon'},
				paths: {label:'Paths',destination:'path'},
				rotation: {label:'Rotation',destination:'locationRotation'},
				shapes: {label:'Back to Shapes',destination:'locationShapes'},
				back: {label:'Back to Main Menu',destination:'returnToMain'},
			},
			map: {
				x: -35,
				y: -14,
				shape: 'round',
				width:15,
			},
		},
		
		polygon: {
			name: "Polygon-shaped Locations",
			desc: [
				"If you set the <span class='codeSpan'>shape</span> to 'polygon', you can define a polygonal location.",
				{className:'codeBox',text:'var gameController = {'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox indent1',text:'locations: {'},
				{className:'codeBox indent2',text:'polygonLocations: {'},
				{className:'codeBox indent3',text:'...'},
				{className:'codeBox indent3',text:'map: {'},
				{className:'codeBox indent4',text:'x: -35,'},
				{className:'codeBox indent4',text:'y: -14,'},
				{className:'codeBox indent4',text:'shape: "polygon",'},
				{className:'codeBox indent4',text:'points: "-2,5 5,5 5,-5 2,-5 2,-7 -2,-7 -5,-5 -5,2 -2,2",'},
				{className:'codeBox indent4',text:'},'},
				{className:'codeBox indent3',text:'},'},
				{className:'codeBox indent2',text:'},'},
				{className:'codeBox indent1',text:'},'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox',text:'};'},
				"Polygonal locations require a <span class='codeSpan'>points</span> string that lists the points of the polygon.  These points are listed in order around the shape, all relative to the center of the location.",
				"Polygonal locations do not use <span class='codeSpan'>width</span> or <span class='codeSpan'>height</span>.",
			],
			exits: {
				round: {label:'Rounds',destination:'round'},
				paths: {label:'Paths',destination:'path'},
				rotation: {label:'Rotation',destination:'locationRotation'},
				shapes: {label:'Back to Shapes',destination:'locationShapes'},
				back: {label:'Back to Main Menu',destination:'returnToMain'},
			},
			map: {
				x: -35,
				y: 6,
				shape: 'polygon',
				points: '-2,5 5,5 5,-5 2,-5 2,-7 -2,-7 -5,-5 -5,2 -2,2',
			},
		},
		
		path: {
			name: "Path-shaped Locations",
			desc: [
				"If you set the <span class='codeSpan'>shape</span> to 'path', you can define a complex shape to represent a location.",
				{className:'codeBox',text:'var gameController = {'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox indent1',text:'locations: {'},
				{className:'codeBox indent2',text:'pathLocations: {'},
				{className:'codeBox indent3',text:'...'},
				{className:'codeBox indent3',text:'map: {'},
				{className:'codeBox indent4',text:'x: -35,'},
				{className:'codeBox indent4',text:'y: 26,'},
				{className:'codeBox indent4',text:'shape: "path",'},
				{className:'codeBox indent4',text:'d: "M -5,-5 L5,-5 Q 5,5 0,5 L -5,5 L -5,3 Q-8,0 -5,-3 L-5,-5",'},
				{className:'codeBox indent4',text:'},'},
				{className:'codeBox indent3',text:'},'},
				{className:'codeBox indent2',text:'},'},
				{className:'codeBox indent1',text:'},'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox',text:'};'},
				"Path-shaped locations require a <span class='codeSpan'>d</span> string that defines the path the walls follow.  Paths can include straight lines, angled lines, arcs, curves, and gaps.",
				"The <span class='codeSpan'>d</span> string is used to create an SVG shape. Unfortunately, the complexities of how SVG interprets path commands is well beyond the scope of this tutorial.  However, all the details can be found <a href='https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d#Path_commands' target='mdn'>here</a>.",
				"All points in <span class='codeSpan'>d</span> are relative to the center of the location.",
				"Path-shaped locations do not use <span class='codeSpan'>width</span> or <span class='codeSpan'>height</span>.",
			],
			exits: {
				round: {label:'Rounds',destination:'round'},
				polygon: {label:'Polygons',destination:'polygon'},
				shapes: {label:'Back to Shapes',destination:'locationShapes'},
				back: {label:'Back to Main Menu',destination:'returnToMain'},
			},
			map: {
				x: -35,
				y: 26,
				shape: 'path',
				d: 'M -5,-5 L5,-5 Q 5,5 0,5 L -5,5 L -5,3 Q-8,0 -5,-3 L-5,-5',
			},
		},
		
		locationRotation: {
			name: "Location Rotation",
			desc: [
				"Set the <span class='codeSpan'>rotate</span> in a location's <span class='codeSpan'>map</span>, to turn the location's shape around.",
				{className:'codeBox',text:'var gameController = {'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox indent1',text:'locations: {'},
				{className:'codeBox indent2',text:'roundLocations: {'},
				{className:'codeBox indent3',text:'...'},
				{className:'codeBox indent3',text:'map: {'},
				{className:'codeBox indent4',text:'x: -50,'},
				{className:'codeBox indent4',text:'y: -7,'},
				{className:'codeBox indent4',text:'shape: "round",'},
				{className:'codeBox indent4',text:'width: 15,'},
				{className:'codeBox indent4',text:'rotate: 30,'},
				{className:'codeBox indent4',text:'},'},
				{className:'codeBox indent3',text:'},'},
				{className:'codeBox indent2',text:'},'},
				{className:'codeBox indent1',text:'},'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox',text:'};'},
				"The <span class='codeSpan'>rotate</span> attribute is measured in degrees.",
				"Location rotation has no effect on the location's exits.",
			],
			exits: {
				round: {label:'Rounds',destination:'round'},
				polygon: {label:'Polygons',destination:'polygon'},
			},
			map: {
				x: -50,
				y: -7,
				shape: 'round',
				width: 15,
				rotate: 30,
			},
		},
		
		mappingExits: {
			name: 'Mapping Exits',
			desc: [
				"By default, exits are drawn from the center of the originating location to the center of the destination location.  Default exits are white and 1 unit wide.",
				"You can see how that looks where the map connects the Mapping hub to this location.",
				"You can change where exits start and end by setting their offset values.  The exit from this location east starts in the location's corner instead of its center.",
				"You can also change the color and width of an exit.  The exit to the north has been styled in this way.",
			],
			exits: {
				exitColors: {label:'Exit Colors',destination:'exitColors',stroke:'red',width:3},
				exitOffsets: {label:'Offset Exits',destination:'offsetExits',x1:22,y1:3,x2:30,y2:9},
				deets: {label:'Back to Mapping Details',destination:'mappingDetails'},
				back: {label:'Back to Main Menu',destination:'returnToMain'}
			},
			map: {
				x: 17,
				y: 6,
			},
		},
		
		offsetExits: {
			name: 'Offset Exits',
			desc: [
				"By default, exits start at their originating location's center.  To change where an exit starts on the map, you can set the <span class='codeSpan'>x1</span> and <span class='codeSpan'>y1</span> attributes on the exit object.",
				"By default, exits end at their destination location's center.  To change where an exit ends, set the <span class='codeSpan'>x2</span> and <span class='codeSpan'>y2</span> attributes on the exit object.",
				{className:'codeBox',text:'var gameController = {'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox indent1',text:'locations: {'},
				{className:'codeBox indent2',text:'offsetExits: {'},
				{className:'codeBox indent3',text:'...'},
				{className:'codeBox indent3',text:'exits: {'},
				{className:'codeBox indent4',text:'back: {'},
				{className:'codeBox indent5',text:'label:"Back to Mapping Exits",'},
				{className:'codeBox indent5',text:'destination:"mappingExits",'},
				{className:'codeBox indent5',text:'x1: 30,'},
				{className:'codeBox indent5',text:'y1: 9,'},
				{className:'codeBox indent5',text:'x2: 22,'},
				{className:'codeBox indent5',text:'y2: 3,'},
				{className:'codeBox indent4',text:'},'},
				{className:'codeBox indent3',text:'},'},
				{className:'codeBox indent2',text:'},'},
				{className:'codeBox indent1',text:'},'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox',text:'};'},
				"Because exits are often paired there and back, the map often is displaying two exits where there appears to be one.  They simply overlap exactly.  If you set the <span class='codeSpan'>x1</span> and <span class='codeSpan'>y1</span> on one exit, you will need to set the <span class='codeSpan'>x2</span> and <span class='codeSpan'>y2</span> on the reciprocal exit to the same values, and vice-versa.  Doing so preserves the overlap.",
				"The <span class='codeSpan'>x1</span> and <span class='codeSpan'>y1</span> coordinates are absolute, using the same coordinate system as the locations' <span class='codeSpan'>x</span> and <span class='codeSpan'>y</span> attributes.  To set them relative to the location's center, see the next room.",
			],
			exits: {
				relative: {label:"Relative Offsets",destination:'relativeOffsetExits',dx1:-3,dy1:5,dx2:3,dy2:-5},
				backExits: {label:'Back to Mapping Exits',destination:'mappingDetails',x1:30,y1:9,x2:22,y2:3},
				back: {label:'Back to Main Menu',destination:'returnToMain'}
			},
			map: {
				x: 35,
				y: 6,
			},
		},
		
		relativeOffsetExits: {
			name: 'Offset Exits',
			desc: [
				"Alternately, you can set the exit start and end points <em>relative</em> to the location centers using <span class='codeSpan'>dx1</span>, <span class='codeSpan'>dy1</span>, <span class='codeSpan'>dx2</span>, and <span class='codeSpan'>dy2</span>.",
				{className:'codeBox',text:'var gameController = {'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox indent1',text:'locations: {'},
				{className:'codeBox indent2',text:'relativeOffsetExits: {'},
				{className:'codeBox indent3',text:'...'},
				{className:'codeBox indent3',text:'exits: {'},
				{className:'codeBox indent4',text:'back: {'},
				{className:'codeBox indent5',text:'label:"Back to Offset Exits",'},
				{className:'codeBox indent5',text:'destination:"offsetExits",'},
				{className:'codeBox indent5',text:'dx1: 3,'},
				{className:'codeBox indent5',text:'dy1: -5,'},
				{className:'codeBox indent5',text:'dx2: -3,'},
				{className:'codeBox indent5',text:'dy2: 5,'},
				{className:'codeBox indent4',text:'},'},
				{className:'codeBox indent3',text:'},'},
				{className:'codeBox indent2',text:'},'},
				{className:'codeBox indent1',text:'},'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox',text:'};'},
				"The attributes <span class='codeSpan'>dx1</span> and <span class='codeSpan'>dy1</span> define the exit's start relative to the originating location.",
				"Meanwhile, the attributes <span class='codeSpan'>dx2</span> and <span class='codeSpan'>dy2</span> define the exit's start relative to the <em>destination</em> location.",
				"Reciprocal exits still need their endpoints to match: one exit's <span class='codeSpan'>dx1</span> and <span class='codeSpan'>dy1</span> is its reciprocal's <span class='codeSpan'>dx2</span> and <span class='codeSpan'>dy2</span>.",
			],
			exits: {
				exitOffsets: {label:'Back to Offset Exits',destination:'offsetExits',dx1:3,dy1:-5,dx2:-3,dy2:5},
				back: {label:'Back to Main Menu',destination:'returnToMain'}
			},
			map: {
				x: 35,
				y: 21,
			},
		},
		
		exitColors: {
			name: 'Exit Colors',
			desc: [
				"To change how an exit is displayed on the map, you can set the <span class='codeSpan'>stroke</span> and <span class='codeSpan'>width</span> attributes on the exit object.",
				{className:'codeBox',text:'var gameController = {'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox indent1',text:'locations: {'},
				{className:'codeBox indent2',text:'exitColors: {'},
				{className:'codeBox indent3',text:'...'},
				{className:'codeBox indent3',text:'exits: {'},
				{className:'codeBox indent4',text:'backToMappingExits: {'},
				{className:'codeBox indent5',text:'label: "Back to Mapping Exits",'},
				{className:'codeBox indent5',text:'destination: "mappingExits",'},
				{className:'codeBox indent5',text:'stroke: "red",'},
				{className:'codeBox indent5',text:'width: 3,'},
				{className:'codeBox indent4',text:'},'},
				{className:'codeBox indent3',text:'},'},
				{className:'codeBox indent2',text:'},'},
				{className:'codeBox indent1',text:'},'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox',text:'};'},
				"You can set <span class='codeSpan'>stroke</span> to an <a href='https://htmlcolorcodes.com/color-names/' target='htmlcolors'>HTML color name</a> or a hexcode.",
				"If you set an exit's <span class='codeSpan'>stroke</span> to 'none', it will not display on the map.",
			],
			exits: {
				colors: {label:'Location Colors',destination:'locationColors',stroke:'cyan',width:8},
				deets: {label:'Back to Mapping Exits',destination:'mappingExits',stroke:'red',width:3},
				back: {label:'Back to Main Menu',destination:'returnToMain'}
			},
			map: {
				x: 17,
				y: -11,
			},
		},
		
		inventoryLocation: {
			name: "Inventory and Locations",
			desc: [
				"Inventory functions are integrated with the Locations code when you use both.",
				"Items available in a location are listed in the location object's <span class='codeSpan'>contents</span> array.  A button for each such item will display at the bottom of the location's description.",
				"The player may also drop items with a button in the inventory, which are then added to the location's <span class='codeSpan'>contents</span> array.",
				"There are two functions for managing items in locations:",
				"<span class='codeSpan'>contrail.pickupItem(item)</span> will transfer the item from the player's location to the player's inventory.",
				"<span class='codeSpan'>contrail.dropItem(item)</span> transfers the item from the player's inventory to the player's location.",
			],
			contents: [
				"Banana Pie",
			],
			exits: {
				itemUse: {label:'Using Items in Locations',destination:'inventoryUseLocation'},
				objItems: {label:'Objective Items in Locations',destination:'objectiveItemsInLocation'},
				back: {label:'Back to Main Menu',destination:'returnToMain'}
			},
		},
		
		inventoryUseLocation: {
			name: "Using Items in Locations",
			desc: [
				"Items can have use functions that only work in certain locations.  The function is stored on the location's object under the same <span class='codeSpan'>'use'+itemName</span> key as a global use function.",
				{className:'codeBox',text:'var gameController = {'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox indent1',text:'locations: {'},
				{className:'codeBox indent2',text:'...'},
				{className:'codeBox indent2',text:'undergroundBunker: {'},
				{className:'codeBox indent3',text:'...'},
				{className:'codeBox indent3',text:'useCellphone: function() {'},
				{className:'codeBox indent4',text:'view.addToFeed("No reception here.")'},
				{className:'codeBox indent3',text:'},'},
				{className:'codeBox indent2',text:'},'},
				{className:'codeBox indent2',text:'...'},
				{className:'codeBox indent1',text:'},'},
				{className:'codeBox indent1',text:'...'},
				{className:'codeBox',text:'};'},
				"If an item has a location-specific use and a global use (defined on <span class='codeSpan'>gameController</span>), the location-specific function will take precedence when the player is in that location.",
			],
			contents: [],
			exits: {
				inventory: {label:'Inventory and Locations',destination:'inventoryLocation'},
				back: {label:'Back to Main Menu',destination:'returnToMain'}
			},
		},
		
		objectiveItemsInLocation: {
			name: "Objective Items in Locations",
			desc: [
				"The Locations code uses a few more attributes on objective items.",
				{className:'codeBox',text:'{'},
				{className:'codeBox indent1',text:'...,'},
				{className:'codeBox indent1',text:'desc: "This gooey pie immediately sticks to your hands!",'},
				{className:'codeBox indent1',text:'droppable: false,'},
				{className:'codeBox',text:'}'},
				"The <span class='codeSpan'>desc</span> attribute displays when the item is picked up for the first time.  Afterwards, the <span class='codeSpan'>examined</span> attribute is set to <span class='codeSpan'>true</span> the default pick up message is displayed.",
				"If <span class='codeSpan'>droppable</span> is set to <span class='codeSpan'>false</span>, the item cannot be dropped.",
			],
			contents: [
				{name:'Lemon Ice Box Pie',desc:'This chilly almost-pie, almost-cheesecake topped with bright yellow filling tantalizes your eyes.'},
				{name:'Berry Pie',desc:'This gooey berry pie immediately sticks to your hands!',droppable:false},
			],
			exits: {
				inventory: {label:'Inventory and Locations',destination:'inventoryLocation'},
				back: {label:'Back to Main Menu',destination:'returnToMain'}
			},
		},
		
		clockAndLocations: {
			name: "Clock and Locations",
			desc: [
				"By default, the player moving through an exit takes an amount of time equal to the <span>defaultTimeIncrement</span>.",
				"You can change that amount of time for any given exit by setting its <span class='codeSpan'>time</span> attribute.  This attribute's value multiplies the <span>defaultTimeIncrement</span> for that exit.  If your default is one minute, setting <span class='codeSpan'>time</span> to 20 will make that exit take 20 minutes.",
				"Taing the long road below increments the clock a full hour, while the short road takes just one minute:",
			],
			exits: {
				longRoad: {label:"The Long Road",destination:'clockAndLocations2',time:3600,transition:"You walk for a long, long time to get to your destination."},
				shortRoad: {label:"The Short Road",destination:'clockAndLocations2',time:60,transition:"You take the shortcut to your destination."},
				back: {label:'Back to Main Menu',destination:'returnToMain'}
			},
		},
		
		clockAndLocations2: {
			name: "Clock, Locations AND Mapping",
			desc: [
				'If you are also using Mapping, exits that traverse a large distance can be given longer <span class="codeSpan">time</span>s than exits that traverse short distances.',
			],
			exits: {
				longRoad: {label:"The Long Road",destination:'clockAndLocations',time:3600,transition:"You walk for a long, long time to get to your destination."},
				shortRoad: {label:"The Short Road",destination:'clockAndLocations',time:60,transition:"You take the shortcut to your destination."},
				back: {label:'Back to Main Menu',destination:'returnToMain'}
			},
		},
		
	},
	
	inventoryDetails: function() {
		currentGame = {
			inventory: ['Apple Pie','Copper Key'],
		};
		view.updateActions();
		var array = [
			'<h3>Inventory</h3>',
			'Your game might include the player acquiring and using items, such as keys or food or other things.  The Inventory functions can make this easy to implement.',
			"Items the player has acquired are stored in the <span class='codeSpan'>inventory</span> array on the <span class='codeSpan'>currentGame</span> object.  When <span class='codeSpan'>inventory</span> is defined, the Inventory button appears to the left.",
			'An item may be defined simply as a unique string, such as "Iron Key" or "Banana Pie".',
			"More complex items can also be [[defined as objects|objectiveItems]].  You can use simple items and objective items side-by-side.",
			"Inventory functions include:",
			"<span class='codeSpan'>contrail.gainItem(item)</span> adds the item to the player's inventory.",
			"<span class='codeSpan'>contrail.removeItem(item)</span> removes the item from the player's inventory.",
			"<span class='codeSpan'>contrail.hasItem(item or name)</span> returns 'true' if the player has the given simple item in their inventory, or returns the objective item in their inventory with the given name.",
			"<span class='codeSpan'>contrail.useItem(item)</span> makes use of the item, triggering the item's [[use function|itemexecutes]].",
			"The Inventory code can work alongside the [[Locations|inventoryLocation]] code.",
			"[[Back to Main Menu|clearInventory]]"
		];
		view.addToFeed(array,true);
	},
	
	examinePie: function() {
		view.addToFeed('There are '+this.slicesLeft+' slices left of '+this.name+'.');
	},
	
	servePie: function(item) {
		this.slicesLeft--
		if (this.slicesLeft == 0) {
			view.addToFeed('You serve the last slice of '+this.name+'.  There are '+this.slicesLeft+' slices left.');
			contrail.removeItem(this);
		} else {
			view.addToFeed('You serve a slice of '+this.name+'.');
		};
	},
	
	clearInventory: function() {
		currentGame = undefined;
		view.updateActions();
		gameController.returnToMain();
	},
	
	objectiveItems: function() {
		currentGame.inventory.push({name:'Peach Pie',desc:'a pie',slicesLeft: 3,itemUses:[{label:'Examine',execute:'examinePie'},{label:'Serve',execute:'servePie'}]});
		var paragraphs = [
			"<h3>Objective Items</h3>",
			"An item can be defined as an object.  This allows the item to carry more characteristics, track its own state, and be more interactive.",
			{className:'codeBox',text:'{'},
			{className:'codeBox indent1',text:'name: "Peach Pie",'},
			{className:'codeBox indent1',text:'slicesLeft: 3,'},
			{className:'codeBox indent1',text:'itemUses: [,'},
			{className:'codeBox indent2',text:'{label:"Examine",execute:"examinePie"},'},
			{className:'codeBox indent2',text:'{label:"Serve",execute:"servePie"},'},
			{className:'codeBox indent1',text:'],'},
			{className:'codeBox',text:'}'},
			"(The above Peach Pie object has been added to your inventory.)",
			"The object's <span class='codespan'>name</span> attribute is used for display purposes and for inventory functions.",
			"You may add other attributes of your naming to track on/off status, a dwindling number of uses, or other information.",
			"Objective items can have an array at <span class='codeSpan'>itemUses</span> with multiple uses for the item.  Each potential use needs a button label and the name of a function on <span class='codeSpan'>gameController</span>.  Use buttons are displayed alongside the item in the inventory panel.  Clicking on a button will execute its associated function, passing the item as <span class='codeSpan'>this</span>.",
			"If your game also uses [[Locations|inventoryLocation]], more attributes become relevant for objective items.",
			"[[Back to Main Menu|clearInventory]]"
		];
		view.addToFeed(paragraphs);
	},
	
	itemexecutes: [
		'<h3>Item Use Functions</h3>',
		'Your game can involve using the items that the player collects.  These item uses trigger functions stored on <span class="codeSpan">gameController</span>.',
		{className:'codeBox',text:'var gameController = {'},
		{className:'codeBox indent1',text:'...'},
		{className:'codeBox indent1',text:'useApplePie: function() {'},
		{className:'codeBox indent2',text:'view.addToFeed("You eat some "+this+".  Mmmm, tasty!");'},
		{className:'codeBox indent1',text:'},'},
		{className:'codeBox indent1',text:'...'},
		{className:'codeBox',text:'};'},
		"Simple items can trigger a single function, with a key composed of the prefix 'use' prepended to the item's name without spaces.  In the example above, the use function for the item 'Apple Pie' is 'useApplePie'.",
		"If a use function is defined for an object, the inventory pane will display a 'Use' button alongside the object's name.  You can see this by clicking on the Inventory button to the left.",
		"[[Objective items|objectiveItems]] can list multiple use functions, each with its own button in the inventory panel.",
		"Whenever an item is used, the function is called with the item passed as <span class='codeSpan'>this</span>.",
		"[[Back to Main Menu|clearInventory]]"
	],
	
	useApplePie: function() {
		view.addToFeed("You eat some "+this+".  Mmmm, tasty!");
	},
	
	inventoryLocation: function() {
		if (currentGame == undefined) {currentGame = {}};
		contrail.moveLocation('inventoryLocation');
	},
	
	setupClock: function() {
		gameController.timeFormat = {
			day: true,
			hour: true,
			minute: true,
			second: true,
			turns: true,
		};
		currentGame = {turns: 23,time:new Date(),vars:{}};
		view.updateTime();
	},
	
	clockDetails: function() {
		gameController.setupClock();
		var paragraphs = [
			'<h3>Clock</h3>',
			'Contrail keeps track of the number of actions the player makes and how long time has advanced since the start of the game.  To display this information on the screen, set <span class="codeSpan">timeFormat</span>.',
			{className:'codeBox',text:'var gameController = {'},
			{className:'codeBox indent1',text:'...'},
			{className:'codeBox indent1',text:'timeFormat: {'},
			{className:'codeBox indent2',text:'year: false,'},
			{className:'codeBox indent2',text:'month: false,'},
			{className:'codeBox indent2',text:'date: false,'},
			{className:'codeBox indent2',text:'day: true,'},
			{className:'codeBox indent2',text:'hour: true,'},
			{className:'codeBox indent2',text:'minute: true,'},
			{className:'codeBox indent2',text:'second: true,'},
			{className:'codeBox indent2',text:'turns: true,'},
			{className:'codeBox indent1',text:'},'},
			{className:'codeBox indent1',text:'...'},
			{className:'codeBox',text:'};'},
			"To determine the default amount of time that the clock is incremented each time the player clicks a link, takes an exit, or interacts with an item, set your own <span class='codeSpan'>defaultTimeIncrement</span> on <span class='codeSpan'>gameController</span>.",
			"The <span class='codeSpan'>contrail.incrementTime(milliseconds)</span> function will increment the clock the given number of milliseconds.",
			"If <span class='codeSpan'>gameController.timePasses(seconds)</span> is defined, it will trigger each time the clock is advanced, passed the number of seconds that has passed as an argument.",
			'The Clock is integrated with [[Inventory|clockAndInventory]] and [[Locations|clockAndLocations]]',
			"[[Back to Main Menu|clearClock]]",
		];
		view.addToFeed(paragraphs,true);
	},
	
	clockAndInventory: [
		'<h3>Inventory and Clock</h3>',
		'Using, picking up, and dropping an item all increment the clock the <span class="codeSpan">defaultTimeIncrement</span>.  To change this, you can set the following attributes on objective items:',
		"An item's <span class='codeSpan'>useTime</span> will multiply the time incremented when the player uses the item.  This only affects the basic <span class='codeSpan'>'use'+item.name</span> function; the <span class='codeSpan'>executes</span> listed in <span class='codeSpan'>itemUses</span> must call <span class='codeSpan'>contrail.incrementTime()</span> on their own.",
		"An item's <span class='codeSpan'>pickupTime</span> will multiply the time incremented when the item is picked up.",
		"An item's <span class='codeSpan'>dropTime</span> will multiply the time incremented when the item is dropped.",
		"Setting any of these to 0 will make the action take no time at all.",
		"[[Back to Clock|clockDetails]]",
		"[[Back to Main Menu|clearClock]]",
	],
	
	clockAndLocations: function() {
		if (currentGame == undefined) {currentGame = {}};
		contrail.moveLocation('clockAndLocations');
	},
	
	clearClock: function() {
		gameController.timeFormat = undefined;
		currentGame = undefined;
		view.updateTime();
		gameController.returnToMain();
	},
	
	newGame: function() {
		console.log('new game');
		currentGame = {};
	},
};