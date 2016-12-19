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
    }
  }
  service.init();
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
        Object.keys($scope.checked).forEach(checkedItemClass => {
          var numClassItemsOwned = 0;
          Object.keys($scope.checked[checkedItemClass]).forEach(item => {
            if($scope.checked[checkedItemClass][item] == true) {
              numClassItemsOwned++;
            }
          });

          // We're going to have to do some gymnastics to figure out how many items total there are for this time of item.
          // This is because the data source and the templates (models) do not match.
          // Fixing that for for all existing users is an exercise perhaps left to someone more familiar with Angular than I, however
          // in order to make this work we can simply create a mapping of the incorrect field/local-storage names so that we can find
          // their matching data source items.
          var dataItemClass = checkedItemClass;

          // First we do the ones that are different for all events
          switch(checkedItemClass) {
            case "legendary":
              dataItemClass = "skinsLegendary";
              break;
            case "epic":
              dataItemClass = "skinsEpic";
              break;
          }

          // Winter Wonderland 2016 specific issues
          // Technically we don't need voicelines or victoryposes because those will be empty objects,
          // but it's the simply way not to throw an error.
          if($scope.data.id == "winterwonderland2016") {
            switch(checkedItemClass) {
              case "voicelines":
                dataItemClass = "voice";
                break;
              case "victoryposes":
                dataItemClass = "poses";
                break;
            }
          }

          if(!$scope.data.items[dataItemClass]) {
            console.log("Could not locate data source for "+dataItemClass);
          }

          var numClassItems = Object.keys($scope.data.items[dataItemClass]).length;
          console.log("Calculating remaining cost for "+checkedItemClass+"("+dataItemClass+"). User has "+numClassItemsOwned+" of "+numClassItems+".");
          console.log($scope.data.items[dataItemClass]);
          $scope.remainingcost[checkedItemClass] = (numClassItems - numClassItemsOwned)*$scope.cost[checkedItemClass];
          console.log($scope.remainingcost);
        });

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
