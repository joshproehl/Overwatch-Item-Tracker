OWI.factory("StorageService", function() {
  var service = {
    data: {},
    settings: {},
    defaults: {
      particles: true
    },
    getData: function() {
      return service.data
    },
    getSetting: function(key) {
      return (key in service.settings ? service.settings[key] : (key in service.defaults ? service.defaults[key] : undefined))
    },
    setSetting: function(key, value) {
      service.settings[key] = value;
      service.persist(true);
    },
    setData: function(data) {
      service.data = data;
      service.persist();
    },
    persist: function(settings) {
      localStorage.setItem(settings ? 'settings' : 'data', angular.toJson(service[settings ? 'settings' : 'data']));
    },
    init: function() {
      var storedData = localStorage.getItem('data')
      if (storedData) {
        service.data = angular.fromJson(storedData);
      }
      var storedSettings = localStorage.getItem('settings');
      if (!storedSettings) {
        service.settings = service.defaults;
      } else {
        service.settings = angular.fromJson(storedSettings);
      }
    },

    // This function should be called when loading data, and will manually make any schema changes we've had to make, allowing users
    // with an old schema in their localstorage to keep their data.
    // WARNING: These are *destructive* operations and will change existing user's localdata. This should be just fine as we're going
    // to be very careful about when a migration is called though.
    upgradeSchema: function() {
      if(!service.data["schemaVersion"]) {
        if(service.data["summergames2016"]) {

          // standardize everything on "skinsLegendary"
          if(service.data["summergames2016"]["legendary"]) {
            service.data["summergames2016"]["skinsLegendary"] = service.data["summergames2016"]["legendary"];
            delete service.data["summergames2016"]["legendary"];
          }

          // standardize everything on "skinsEpic"
          if(service.data["summergames2016"]["epic"]) {
            service.data["summergames2016"]["skinsEpic"] = service.data["summergames2016"]["epic"];
            delete service.data["summergames2016"]["epic"];
          }
        }

        if(service.data["halloween2016"]) {
          // standardize everything on "skinsLegendary"
          if(service.data["halloween2016"]["legendary"]) {
            service.data["halloween2016"]["skinsLegendary"] = service.data["halloween2016"]["legendary"];
            delete service.data["halloween2016"]["legendary"];
          }

          // standardize everything on "skinsEpic"
          if(service.data["halloween2016"]["epic"]) {
            service.data["halloween2016"]["skinsEpic"] = service.data["halloween2016"]["epic"];
            delete service.data["halloween2016"]["epic"];
          }
        }

        if(service.data["winterwonderland2016"]) {
          // standardize everything on "skinsLegendary"
          if(service.data["winterwonderland2016"]["legendary"]) {
            service.data["winterwonderland2016"]["skinsLegendary"] = service.data["winterwonderland2016"]["legendary"];
            delete service.data["winterwonderland2016"]["legendary"];
          }

          // standardize everything on "skinsEpic"
          if(service.data["winterwonderland2016"]["epic"]) {
            service.data["winterwonderland2016"]["skinsEpic"] = service.data["winterwonderland2016"]["epic"];
            delete service.data["winterwonderland2016"]["epic"];
          }

          // Update WinterWonderland2016's nonstandard "voice" item type to the standard "voicelines"
          if(service.data["winterwonderland2016"]["voice"]) {
            service.data["winterwonderland2016"]["voicelines"] = service.data["winterwonderland2016"]["voice"];
            delete service.data["winterwonderland2016"]["voice"];
          }

          // Update WinterWonderland2016's nonstandard "poses" item type to the standard "victoryposes"
          if(service.data["winterwonderland2016"]["poses"]) {
            service.data["winterwonderland2016"]["victoryposes"] = service.data["winterwonderland2016"]["poses"];
            delete service.data["winterwonderland2016"]["poses"];
          }
        }

        // we're correctly updated to new schema, set version so we don't call this migration again.
        service.data["schemaVersion"] = 2;
        service.persist();
      }  // else if(service.data["schemaVersion"] == 2) { /* migration to schema v3 */ }
    }
  }
  service.init();
  service.upgradeSchema();
  return service;
})

OWI.controller('MainCtrl', ["Data", "$uibModal", "StorageService", function(Data, $uibModal, StorageService) {
  this.preview = false;
  this.updates = Data.updates;
  this.selectedUpdate = 2;

  this.openSettings = function() {
    $uibModal.open({
      templateUrl: './templates/settings.html',
      controller: 'SettingsCtrl',
      controllerAs: 'settings'
    })
  };
  this.particles = StorageService.getSetting('particles');
  var savedData = StorageService.getData();
  Data.checked = Object.assign({}, Data.checked, savedData);
}]);

OWI.controller('SettingsCtrl', ["$uibModalInstance", "StorageService", function($uibModalInstance, StorageService) {
  this.particles = StorageService.getSetting('particles');

  this.close = function() {
    $uibModalInstance.dismiss('close')
  }

  this.resetData = function() {
    localStorage.removeItem('data');
    location.reload();
  }

  this.toggleParticles = function() {
    this.particles = !this.particles;
    StorageService.setSetting('particles', this.particles);
    location.reload();
  }
}])

OWI.directive("scroll", function ($window) {
  return function($scope) {
    angular.element($window).bind("scroll", function() {
      if (this.innerWidth > 1540) return;
      $scope.isFixed = this.pageYOffset >= 200 ? true : false;
      $scope.$apply();
    });
  };
});

OWI.directive("update", ["Data", "StorageService", function(Data, StorageService) {
  return {
    restrict: 'E',
    scope: {
      data: '='
    },
    templateUrl: function(element, attrs) {
      return './templates/' + attrs.template + '.html';
    },
    controller: function($scope) {
      $scope.preview = false;

      $scope.checked = Data.checked[$scope.data.id];
      $scope.cost = Data.cost[$scope.data.id];
      $scope.remainingcost = Data.remainingcost[$scope.data.id];

      $scope.onSelect = function() {
        Data.checked[$scope.data.id] = $scope.checked;
        StorageService.setData(Data.checked);
        $scope.updateRemainingCosts();
      };

      // We're keeping remaining costs cached and calculating them only when an item is changed.
      $scope.updateRemainingCosts = function() {
        Object.keys($scope.checked).forEach(itemClass => {
          console.log("Updating costs for "+itemClass);
          var numClassItemsOwned = 0;
          Object.keys($scope.checked[itemClass]).forEach(item => {
            if($scope.checked[itemClass][item] == true) {
              numClassItemsOwned++;
            }
          });

          var numClassItems = Object.keys($scope.data.items[itemClass]).length;
          console.log("User has "+numClassItemsOwned+" of "+numClassItems+" from "+itemClass+", which cost "+$scope.cost[itemClass]+" each.");
          $scope.remainingcost[itemClass] = (numClassItems - numClassItemsOwned)*$scope.cost[itemClass];
        });

        console.log("Remaining costs are:");
        console.log($scope.remainingcost);

        // Sum all these calculated costs into the total
        var totalCost = 0;
        Object.keys($scope.remainingcost).forEach(itemClass => {
          if(itemClass != "all") {
            // Have to compare against NaN because we'll have some of the duplicate key names. (voice vs. voicelines, etc...)
            if(!isNaN($scope.remainingcost[itemClass])) {
              totalCost += $scope.remainingcost[itemClass];
            }
          }
        });
        $scope.remainingcost["all"] = totalCost;
      };

      var showTimeout = undefined;
      var hideTimeout = undefined;
      $scope.showPreview = function(what, small) {
        if (what.img && what.img.includes('WINTER_WONDERLAND_2016') && what.img.includes('icons')) return // ignore icons
        if (!what.img && !what.video) return;
        if (showTimeout) return;
        clearTimeout(hideTimeout)
        showTimeout = setTimeout(function () {
          what.isSmall = small;
          $scope.preview = what;
          $scope.$digest();
        }, $scope.preview ? 100 : 650);
      };

      $scope.hidePreview = function() {
        clearTimeout(showTimeout);
        showTimeout = undefined;
        hideTimeout = setTimeout(function () {
          $scope.preview = false;
          $scope.$digest();
        }, 150);
      };

      // Make sure to calculate and show remaining costs on initial load.
      $scope.updateRemainingCosts();
    }
  };
}]);

OWI.directive("particles", function() {
  return {
    restrict: 'E',
    scope: {},
    replace: true,
    template: '<div id="particles-js"></div>',
    controller: function() {
      particlesJS({ //eslint-disable-line
        "particles": {
          "number": {
            "value": 55,
            "density": {
              "enable": true,
              "value_area": 600
            }
          },
          "color": {
            "value": "#ffffff"
          },
          "shape": {
            "type": "circle",
            "stroke": {
              "width": 0,
              "color": "#000000"
            },
            "polygon": {
              "nb_sides": 5
            },
            "image": {
              "src": "img/github.svg",
              "width": 100,
              "height": 100
            }
          },
          "opacity": {
            "value": 0.5,
            "random": false,
            "anim": {
              "enable": false,
              "speed": 1,
              "opacity_min": 0.1,
              "sync": false
            }
          },
          "size": {
            "value": 3,
            "random": true,
            "anim": {
              "enable": false,
              "speed": 40,
              "size_min": 0.1,
              "sync": false
            }
          },
          "line_linked": {
            "enable": false,
            "distance": 150,
            "color": "#ffffff",
            "opacity": 0.4,
            "width": 1
          },
          "move": {
            "enable": true,
            "speed": 4,
            "direction": "bottom",
            "random": true,
            "straight": false,
            "out_mode": "out",
            "bounce": false,
            "attract": {
              "enable": false,
              "rotateX": 600,
              "rotateY": 1200
            }
          }
        },
        "interactivity": {
          "detect_on": "canvas",
          "events": {
            "onhover": {
              "enable": false,
              "mode": "repulse"
            },
            "onclick": {
              "enable": true,
              "mode": "repulse"
            },
            "resize": true
          },
          "modes": {
            "grab": {
              "distance": 400,
              "line_linked": {
                "opacity": 1
              }
            },
            "bubble": {
              "distance": 400,
              "size": 40,
              "duration": 2,
              "opacity": 8,
              "speed": 3
            },
            "repulse": {
              "distance": 200,
              "duration": 0.4
            },
            "push": {
              "particles_nb": 4
            },
            "remove": {
              "particles_nb": 2
            }
          }
        },
        "retina_detect": true
      })
    }
  }
})
