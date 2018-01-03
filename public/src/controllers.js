(function () {
  'use strict';

  var controllers = angular.module('app.controllers', ['app.services']);
  
  /**
   * login controller for dps-pipo
   */
  controllers.controller('LoginController', function (Auth, $state, $stateParams) {
    var self = this;

    self.notAuthorized = $stateParams.notAuthorized;

    self.signIn = function () {

      Auth.$signInWithPopup("google").then(function (result) {

        $state.go('app.home');

      }).catch(function (error) {
        console.error("Authentication failed:", error);
      });
    };
  });

  /**
   * user controller for dps-pipo
   */
  controllers.controller('UserController', function ($scope, Auth, Profile, Admin, $state, $mdSidenav, Utils, $mdToast) {
    var self = this;
    //placed it here on parent controller so that it can be remembered between home and detail views
    self.cases = [];
    self.casesSelected = [];
    self.auditTrail = [];
    self.caseSearch = {};
    self.auditSearch = {};

    //listen to firebase user
    Auth.$onAuthStateChanged(function (firebaseUser) {
    	
      self.firebaseUser = firebaseUser;

      if (firebaseUser) {
        //check if google account, logout immediately. 
        //rules should also not allow users !google.com
        if (!firebaseUser.email.match(/.*@google.com$/)) {
          self.logout({notAuthorized: true});
        }

        self.profile = Profile(firebaseUser.uid);
        
        self.profile.$loaded().then(function (data) {
          if (!data.ldap) {
            data.ldap = Utils.ldap(firebaseUser.email);
            self.profile.$save().then(function (ref) {
            console.log("Successfully registered: ", data.ldap);
            }, function (error) {
              console.log(error);
            });
          }
        });

        self.admin = Admin(firebaseUser.uid);

      } else {
        //logout, clean stuff
        self.profile.$destroy();
        self.admin.$destroy();
        if (self.cases.$destroy) {
          self.cases.$destroy();
        }
        self.profile = null;
        self.admin = null;
      }
    });

    // start side nav actions
    
    self.logout = function (stateParams) {
      Auth.$signOut();
      $mdSidenav('sideNav').close();
      $state.go('login', stateParams);
    };

    self.gotoHome = function () {
      $mdSidenav('sideNav').close();
      $state.go('app.home');
    };

    self.gotoEmployee = function () {
      $mdSidenav('sideNav').close();
      $state.go('app.employee-list');
    };

    self.gotoFormsforApproval = function () {
        $mdSidenav('sideNav').close();
        $state.go('app.formsforapproval-list');
      };

    self.gotoManageSlo = function () {
	   $mdSidenav('sideNav').close();
	   $state.go('app.manageslo');
	  };
	
    self.gotoManageAdmin = function () {
	   $mdSidenav('sideNav').close();
	   $state.go('app.admin');
	  };
    
    self.toggleSideNav = buildToggler('sideNav');

    function buildToggler(componentId) {
      return function () {
        $mdSidenav(componentId).toggle();
      };
    }
    
    self.debugLogChanged = function () {
      console.log('debug logs', self.debugLog);
      firebase.database.enableLogging(self.debugLog);
      var txt = self.debugLog ? 'Debug logging enabled' : 'Debug logging disabled';
      $mdToast.show(
          $mdToast.simple()
          .textContent(txt)
          .position('bottom right')
          .hideDelay(3000)
          );
    };
    
    // end side nav actions


  });

  /**
   * home controller for dps-pipo
   */
  controllers.controller('HomeController', function ($parse, $compile, $element, $timeout, $state, $stateParams, $scope,
      $firebaseArray, $mdEditDialog, $mdToast, Utils, searchCases, loadSLOobject, loadCategoriesObject, searchP0cases, searchP1cases, searchCategories, saveChanges, loadCategories, getSLObyPriority, deleteSelectedCases) {
    var self = this;

    self.loading = false;
    $scope.orderCriteria = "priority";
    self.casesSelected = [];
    self.pageSize = 10;
    self.currentPage = 1;
 
    self.search = function () {
    	self.loading = true;
        $scope.hc.allcases = searchCases();
        self.loading = false;
    };
    
    self.searchP0 = function () {
    	$scope.hc.casesP0 = searchP0cases();
    };
    
    self.searchP1 = function () {
    	$scope.hc.casesP1 = searchP1cases();
    };
    
    self.getCaseSLO = function(caze) {    	
    	getSLObyPriority(caze).$loaded().then(function(cazeslo) {
    		
    		var el = angular.element(document.querySelector('#timerWrapper-'+caze.caseid));
    		el.removeClass('missedslo');
    		el.empty();
    		$compile(el)($scope);
    	
    		var endDate = new Date(Utils.toTimeStamp(caze.created));    		
    		endDate.setSeconds(endDate.getSeconds() + cazeslo.$value * 60);    		
    		
    		var today = new Date();
    		var diff = endDate - today; 		
    		var diffSeconds = diff / 1000;
    		var dateSeconds = Math.abs(diffSeconds);
  		  	
    		 if(diff < 0) {
    	    		var el = angular.element(document.querySelector('#timerWrapper-'+caze.caseid));
    	    		el.append('Expired');
    	    		el.addClass('missedslo');
    	  		  	$compile(el)($scope);
    		 } else {
    	    		var el = angular.element( document.querySelector('#timerWrapper-'+caze.caseid) );
    	    		el.append('<timer countdown="'+dateSeconds+'" max-time-unit="minute" interval="1000">{{mminutes}} minute{{minutesS}}, {{sseconds}} second{{secondsS}}</timer>');
    	  		  	$compile(el)($scope);
    		}		
  	    });
    };    
    
    self.searchCaseCategory = function(caze) {
    	    	    	
    	var caseCat = null;
    	
    	if("Fabric/Crashlytics" == caze.category) {
    		caseCat = "FabricCrashlytics";
    	} else if ("Firebase 1.0" == caze.category) {
    		caseCat = "Firebase1";
    	} else {
    		var caseCatTemp = caze.category;
    		caseCat = caseCatTemp.replace(/\s+/g, '')
    	}
    	
    	if(caseCat != null && caseCat != '') {
    		
    		searchCategories(caseCat).$loaded().then(function(caseisvalid) {    			
    		    	if(caseisvalid.$value != null) {
    		    		caze.iscategoryvalid = true;
    		    	} else {
    		    		caze.iscategoryvalid = false;
    		    	}    		    	
    		});    		  
    	}

        var categoriesObj = loadCategoriesObject(caze.caseid); 
        var unwatchCategoriesObj = categoriesObj.$watch(function() { 
        	searchCategories(caze.category.replace(/\s+/g, '')).$loaded().then(function(caseisvalid) {    			
		    	if(caseisvalid.$value != null) {
		    		caze.iscategoryvalid = true;
		    	} else {
		    		caze.iscategoryvalid = false;
		    	}    		
            	self.getCaseSLO(caze);
        	});          	
        });
        
        var sloObj = loadSLOobject();
        var unwatchsloObj = sloObj.$watch(function() { 		
        	self.getCaseSLO(caze);
        });      
    };
    
    // update priority
    
    self.updatePriority = function (event, allcases, caze) {
    	event.stopPropagation();
    	
    	$mdEditDialog.show({
            targetEvent: event,
            templateUrl: 'views/dialogs/pipo.html',
            controller: ['$element', '$scope', function ($element, $scope) {      
            	
              $scope.model = caze.priority;
              $scope.dismiss = function () {
                $element.remove();
              };

              $scope.submit = function (model) {
                if (!$scope.editDialog.$invalid) {
                	caze.priority = $scope.model;
                	caze.iscategoryvalid = null;
                	self.getCaseSLO(caze);
                	saveChanges(allcases, caze);
                  $scope.dismiss();
                }
              };
            }]
    	});
    };
    
    // update category
    
    self.updateCategory = function (event, allcases, caze) {
    	event.stopPropagation();
    	
    	$mdEditDialog.show({
            targetEvent: event,
            templateUrl: 'views/dialogs/categories.html',
            controller: ['$element', '$scope', function ($element, $scope) {
            
            $scope.selectedCategory = caze.category; 
            
            $scope.categoryList = loadCategories();
              
            $scope.dismiss = function () {
              $element.remove();
            };

            $scope.submit = function (category) {            	              	  
	            if (!$scope.editDialog.$invalid) {
	            	caze.category = $scope.selectedCategory;
	            	caze.iscategoryvalid = null;
	            	saveChanges(allcases, caze);
	            	$scope.dismiss();
	            }     
            };
              
            }]
    	});
    };
    
    // delete cases
    
    self.deleteCases = function(event, allcases) {
    	angular.forEach(self.casesSelected, function(record){
    	    deleteSelectedCases(allcases, record);
    	    self.casesSelected = [];
    	});
    		  	 
    	$mdToast.show(
    			$mdToast.simple()
    			.textContent("Delete Successful")
    			.position('bottom right')
    			.hideDelay(3000)
    			);
    };
    
    // export cases
    
    self.exportCSV = function (event, cases) {
        	
        var dataToExport = [];
    	var exportData = [];
        
        if (self.casesSelected == '') {
        	dataToExport = cases;
        } else {
        	dataToExport = self.casesSelected;
        }
        	
        angular.forEach(dataToExport, function(record) {
            var copy = Object.assign({}, record);
            for (var key in copy) {
            	if (key.indexOf('$') === 0) {
                    delete copy[key];
                }
            	if (key.indexOf('slo') === 0) {
                    delete copy[key];
                }
            }    	       
            exportData.push(copy);
        });
        	
        var csv = Papa.unparse(exportData);        	   	
        if (csv == null) return;

        var filename = 'pingpong-export.csv';
        if (!csv.match(/^data:text\/csv/i)) {
        	csv = 'data:text/csv;charset=utf-8,' + csv;
        }            
        var data = encodeURI(csv);
        var link = document.createElement('a');
        link.setAttribute('href', data);
        link.setAttribute('download', filename);
        link.click();
    };
    
  });

  /**
   *  manage slo controller for dps-pipo
   */
  controllers.controller('ManageSloController', function ($state, $stateParams, $scope,
      $firebaseArray, loadSLO, saveChanges, currentUser, Utils, Admin, $mdEditDialog) {
	  
	  var self = this;
	  self.loading = false;
	  $scope.editData = {};
	  
	  Admin(currentUser.uid).$loaded().then(function(isadmin) {
	    	if(!isadmin.$value) {
	    		$state.go('app.home');
	    	}
	    });
    
    self.search = function () {
    	self.loading = true;
        $scope.msc.initial = loadSLO();
        self.loading = false;
    };
    
    self.updateSLO = function (event, allSLO, item) {
        event.stopPropagation();
        	
        $mdEditDialog.show({
                targetEvent: event,
                templateUrl: 'views/dialogs/updateslo.html',
                controller: ['$element', '$scope', function ($element, $scope) {
                	
                  $scope.model = item.$value;
                  $scope.casePriority = item.$id;

                  $scope.dismiss = function () {
                    $element.remove();
                  };

                  $scope.submit = function (model) {
                    if (!$scope.editDialog.$invalid) {
                    item.$value = $scope.model;
                    saveChanges(allSLO, item);
                    $scope.dismiss();
                    }
                  };
                }]
        });
        };

  });

  
  /**
   * admin controller for dps-pipo
   */

  controllers.controller('AdminController', function ($scope, $state, $stateParams, usersLoad, 
		  updateUserStatus, $firebaseObject, $firebaseArray, $mdToast, $mdDialog, currentUser, Utils, Admin) {

    var self = this;
    self.usersList = [];
    self.loading = false;
    
    self.searchUsers = function () {
      self.loading = true;
      self.usersList = usersLoad();
      self.loading = false;
    };
      
    Admin(currentUser.uid).$loaded().then(function(isadmin) {
    	if(!isadmin.$value) {
    		$state.go('app.home');
    	}
    });

    self.changeStatus = function (list, user) {
      updateUserStatus(list, user);
    };
  });

  controllers.controller('EmployeeDetailsModalCtrl',function($scope, $state, formData, $filter, $mdDialog, $window){
      $scope.employeeDetails = formData;
      $scope.employeeDetails.birthDate = $filter('date')($scope.employeeDetails.birthDate,'dd/MM/yyyy');
      $scope.employeeDetails.hireDate = $filter('date')($scope.employeeDetails.hireDate,'dd/MM/yyyy');
      console.log($scope.employeeDetails);
      $scope.edit = function(){
          $mdDialog.cancel();
          $state.go('app.employee-edit',{uid:$scope.employeeDetails.$id})
          // $window.location.href = '/employee/edit/'+$scope.employeeDetails.$id;
      };

      $scope.close = function(){
          $mdDialog.cancel();
      };
  });


  controllers.controller('EmployeeListCtrl', function($scope, $state, $firebaseArray, $mdDialog, EmployeeSrvcs){
    var self = this;

    self.showAddEntry = function() {
        $state.go('app.employee-create');
    };

    self.getEmployeeList = function() {
        // self.employeeList = $firebaseArray(employeeRef);
        var data = {};
        // EmployeeSrvcs.getEmpList(data).then(function(response){
        self.employeeList = EmployeeSrvcs.getEmpList();
        console.log(self.employeeList);
        // };
        // self.employeeList = [
        //   {name:'Penaflor, Rommel A. ',role:'Case Handler', contactno:'+639471727639'},
        //   {name:'Penaflor, Rommel A. 1',role:'Case Handler1', contactno:'+6394717276391'},
        // ];
    };

    self.showDetails = function(data, event) {
      $mdDialog.show({
          controller: 'EmployeeDetailsModalCtrl',
          templateUrl: 'views/employee/employee-details-modal.html',
          parent: angular.element(document.body),
          targetEvent: event,
          clickOutsideToClose:true,
          resolve: {
              formData: function(){
                  return data;
              }
          }
        })
        .then(function(answer) {
            $scope.status = 'You said the information was "' + answer + '".';
        }, function() {
            $scope.status = 'You cancelled the dialog.';
        });
    };

    self.init = function() {
        self.getEmployeeList();
    }();
  });

  controllers.controller('EmployeeCreateCtrl', function($scope, $element, $filter, $state, $stateParams, $firebaseArray, $firebaseObject, $mdDialog, EmployeeSrvcs) {
    var self = this;
    var ref = firebase.database().ref();
    var employeeRef = ref.child('employee');
    var teamRef = ref.child('team');

    self.employeeList = [];
    self.emailFormat = /^[a-z]+[a-z0-9._]+@[a-z]+\.[a-z.]{2,5}$/;
    $scope.vegetables = ['Corn' ,'Onions' ,'Kale' ,'Arugula' ,'Peas', 'Zucchini'];
    
    if($stateParams.uid){
        self.action = 'EDIT';
        self.employeeList.uid = $stateParams.uid;
    } else {
        self.action = 'CREATE';
    };
    
    $scope.searchTerm;
    $scope.clearSearchTerm = function() {
      $scope.searchTerm = '';
    };

    self.save = function(data, event) {
        if(self.frmEmpCreate.$valid) {
            var dataCopy = data;

            dataCopy.birthDate = $filter('date')(dataCopy.birthDate,'yyyy-MM-dd');
            dataCopy.hireDate = $filter('date')(dataCopy.hireDate,'yyyy-MM-dd');
            dataCopy.name = dataCopy.lname + ', ' + dataCopy.fname + ' ' + dataCopy.mname;
            
            
            if(self.action == 'CREATE'){
                var key = employeeRef.push().key;
                dataCopy.uid = key;
                
                employeeRef.child(key).set(dataCopy).then( function(response) {
                    $mdDialog.show(
                        $mdDialog.alert()
                        .parent(angular.element(document.querySelector('body')))
                        .clickOutsideToClose(true)
                        .title('Employee Creation')
                        .textContent('Employee profile has been successfully created!')
                        .ariaLabel('Alert Dialog Demo')
                        .ok('Close')
                        .targetEvent(event)
                    );
                },function(error) {
                    alert('Something wrong with creation : ', error.message);
                });
            } else if (self.action == 'EDIT') {
                employeeRef.child(dataCopy.uid).set(dataCopy).then( function(response) {
                    $mdDialog.show(
                        $mdDialog.alert()
                        .parent(angular.element(document.querySelector('body')))
                        .clickOutsideToClose(true)
                        .title('Employee Update')
                        .textContent('Employee profile has been successfully updated!')
                        .ariaLabel('Alert Dialog Demo')
                        .ok('Close')
                        .targetEvent(event)
                    );
                },function(error) {
                    alert('Something wrong upon updating:', error.message);
                });
                
            }
        } else { 
            return;
        }
        
    };


    self.back = function(){
        $state.go('app.employee-list');
    };

    // The md-select directive eats keydown events for some quick select
    // logic. Since we have a search input here, we don't need that logic.
    $element.find('input').on('keydown', function(ev) {
        ev.stopPropagation();
    });

    self.init = function(){
        self.approverList = [];
        self.teamList = [];

        var employeeObj = $firebaseObject(employeeRef)
        employeeObj.$loaded().then(function() {
            angular.forEach(employeeObj, (value, key)=> {
                if (value.isApprover) {
                    var data = value;
                    data.uid = key;
                    self.approverList.push(data);
                }
            });
        });

        var teamObj = $firebaseObject(teamRef)
        teamObj.$loaded().then(function() {
            angular.forEach(teamObj, (value, key)=> {
                var data = value;
                data.teamid = key;
                self.teamList.push(data);
            });
        });

        if (self.action == 'EDIT') {
            EmployeeSrvcs.getEmpDetails(self.employeeList).then(function(response){
                var formData = response[self.employeeList.uid];
                formData.birthDate = new Date(formData.birthDate);
                formData.hireDate = new Date(formData.hireDate);
                self.employeeList = formData;

                console.log(self.employeeList);
            },function(error){
                console.log(error);
            });
        }

    }();

  });

  controllers.controller('FormsForApprovalListCtrl', function($scope, $element, $filter, $state, $stateParams, $firebaseArray, $firebaseObject, $mdDialog, Auth,EmployeeSrvcs) {
    var self = this;
    var ref = firebase.database().ref();
    var formsRef = ref.child('formsforapproval');
    var currentUid = firebase.auth().currentUser.uid;

    self.forms = [];

    self.action = function(action, type){
        if (type == 'APPROVED' || type == 'DECLINED') {
            var data = {
                status:type,
                approvedby:currentUid
            }


            formsRef.child(action.uid).update(data)
            .then(function(snapShots){
                action.status = type;

                $scope.$apply();
            }).catch(function(error) {
                alert("Something went wrong: " + error);
            });

        } else {
            return;
        }
    };

    self.init = function(){
        self.approverList = [];
        self.teamList = [];

        var formsObj = $firebaseObject(formsRef)
        formsObj.$loaded().then(function() {
            angular.forEach(formsObj, (value, key)=> {
                var data = value;
                self.forms.push(data);
            });
        });
    }();

  });
})();
