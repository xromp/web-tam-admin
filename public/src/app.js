(function () {
  'use strict';
  var config = {
    apiKey: "AIzaSyCNm5FVL_PGn8u62Xppwag8O840wrh0ghI",
    authDomain: "onlinereservation-2lx.firebaseapp.com",
    databaseURL: "https://onlinereservation-2lx.firebaseio.com",
    projectId: "onlinereservation-2lx",
    storageBucket: "onlinereservation-2lx.appspot.com",
    messagingSenderId: "737586176541"
  };
  // if (window.location.hostname === 'dps-pipo.firebaseapp.com') {
  //   var config = {
  //     apiKey: "AIzaSyCNm5FVL_PGn8u62Xppwag8O840wrh0ghI",
  //     authDomain: "onlinereservation-2lx.firebaseapp.com",
  //     databaseURL: "https://onlinereservation-2lx.firebaseio.com",
  //     projectId: "onlinereservation-2lx",
  //     storageBucket: "onlinereservation-2lx.appspot.com",
  //     messagingSenderId: "737586176541"
  //   };
  // } else {
    
  // }
  
  firebase.initializeApp(config);

  var app = angular.module('dpsPipo',
    ['ui.router', 'ngMaterial', "ngMessages", 'md.data.table', 'firebase', 'app.controllers', 'timer', 'ng']);

  app.config(function ($stateProvider, $urlRouterProvider, $mdIconProvider, $mdThemingProvider, $locationProvider) {
    $locationProvider.html5Mode(false);

    $mdIconProvider
      .defaultIconSet("./assets/svg/avatars.svg", 128)
      .icon("menu", "./assets/svg/menu.svg", 24)
      .icon("share", "./assets/svg/share.svg", 24)
      .icon("google_plus", "./assets/svg/google_plus.svg", 512)
      .icon("hangouts", "./assets/svg/hangouts.svg", 512)
      .icon("twitter", "./assets/svg/twitter.svg", 512)
      .icon("phone", "./assets/svg/phone.svg", 512);

    $mdThemingProvider.theme('default')
      .primaryPalette('purple'); // blue

    //fix problem with main toolbar input icons
    $mdThemingProvider.theme('toolbar-tools-purple', 'default') // toolbar-tools-blue
      .primaryPalette('purple') // blue-grey
      .dark();

    $stateProvider
      .state("login", {
        url: "/login",
        templateUrl: "views/login.html",
        controller: 'LoginController',
        controllerAs: 'lc',
        params: {
          notAuthorized: null
        }
      })
      .state('app', {
        url: '/app',
        abstract: true,
        templateUrl: 'views/template.html',
        controller: 'UserController',
        controllerAs: 'uc',
        resolve: {
          "currentUser": ["$firebaseAuth", function ($firebaseAuth) {
            return $firebaseAuth().$requireSignIn();
          }]
        }
      })
      .state("app.home", {
        url: "/home",
        templateUrl: "views/home.html",
        controller: "HomeController",
        controllerAs: 'hc'
      })
      .state("app.manageslo", {
          url: "/manageslo",
          templateUrl: "views/manageslo.html",
          controller: "ManageSloController",
          controllerAs: 'msc'
      })
      .state("app.admin", {
          url: "/admin",
          templateUrl: "views/admin.html",
          controller: "AdminController",
          controllerAs: 'ac'
      })
      // rom changes
      .state("app.employee-list", {
        url: "/employee",
        templateUrl: "views/employee/employee-list.html",
        controller: "EmployeeListCtrl",
        controllerAs: 'ec'
      })

      .state("app.employee-create", {
        url: "/employee/create",
        templateUrl: "views/employee/employee-create.html",
        controller: "EmployeeCreateCtrl",
        controllerAs: 'ecc'
      })
      .state('app.employee-edit', {
				url: '/employee/edit/:uid',
				templateUrl:'views/employee/employee-create.html',
				controller:'EmployeeCreateCtrl',
				controllerAs:'ecc'
      })
      
      .state("app.formsforapproval-list", {
        url: "/formsforapproval",
        templateUrl: "views/formsforapproval/formsforapproval-list.html",
        controller: "FormsForApprovalListCtrl",
        controllerAs: 'fc'
      });

    $urlRouterProvider.otherwise('app/home');
  });
  
  app.run(function ($rootScope, $state) {
    $rootScope.$on("$stateChangeError", function (event, toState, toParams, fromState, fromParams, error) {
      console.log('$stateChangeError error', error);
      if (error === "AUTH_REQUIRED") {
        $state.go("login");
      }
    });
  });
  
  //for pagination
  app.filter('paginate', function () {
    return function (input, currentPage, pageSize) {
      var offset = (currentPage - 1) * pageSize;
      return input.slice(offset, offset + pageSize);
    };
  });
  
  app.filter('cut', function () {
      return function (value, wordwise, max, tail) {
          if (!value) return '';

          max = parseInt(max, 10);
          if (!max) return value;
          if (value.length <= max) return value;

          value = value.substr(0, max);
          if (wordwise) {
              var lastspace = value.lastIndexOf(' ');
              if (lastspace !== -1) {
                //Also remove . and , so its gives a cleaner result.
                if (value.charAt(lastspace-1) === '.' || value.charAt(lastspace-1) === ',') {
                  lastspace = lastspace - 1;
                }
                value = value.substr(0, lastspace);
              }
          }

          return value + (tail || ' …');
      };
  });
   
})();