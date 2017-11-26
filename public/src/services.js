(function () {
  'use strict';

  var services = angular.module('app.services', ["firebase"]);
  var baseRef = firebase.database().ref();

  services.factory("Utils", function ($firebaseObject) {
    return {
      ldap: function (email) {
        //assumption is google.com ldap has no dots (.)
        return email.substring(0, email.lastIndexOf("@"));
      },
      toTimeStamp: function (dateString) {
        var parts = dateString.split('/');
		var date = new Date(parts[0] + "/" + parts[1] + "/" + parts[2]);   
        return date.getTime();
      }
    };
  });

  services.factory("Auth", function ($firebaseAuth) {
    return $firebaseAuth();
  });

  services.factory("Profile", function ($firebaseObject) {
    return function (uid) {
      var profileRef = baseRef.child("users").child(uid);
      return $firebaseObject(profileRef);
    };
  });

  services.factory("Admin", function ($firebaseObject) {
    return function (uid) {
      var adminRef = baseRef.child("admins").child(uid);
      return $firebaseObject(adminRef);
    };
  });
  
  // query to retrieve all cases
  services.factory("searchCases", function($firebaseArray) {
	  return function () {
	      var casesRef = baseRef.child("cases");
	      return $firebaseArray(casesRef);
	    };
  });
  
  // query to retrieve all cases
  services.factory("loadCategories", function($firebaseArray) {
	  return function () {
	      var categoriesRef = baseRef.child("categories");
	      return $firebaseArray(categoriesRef);
	    };
  });
  
  // search category
  services.factory("searchCategories", function($firebaseObject) {
	  return function (category) {
		  var sloRef = baseRef.child("categories");
		  var priorityRef = sloRef.child(category);
		  return $firebaseObject(priorityRef);
	  };
  });
  
  // search category
  services.factory("loadCategoriesObject", function($firebaseObject) {
	  return function (caseid) {
		  var sloRef = baseRef.child("cases").child(caseid);
		  return $firebaseObject(sloRef);
	  };
  });
  
  // query to retrieve P0 cases
  services.factory("searchP0cases", function($firebaseArray) {
	  return function () {
	      var casesRef = baseRef.child("cases");
	      var priorityRef = casesRef.orderByChild("priority").equalTo("0");
	      return $firebaseArray(priorityRef);
	    };
  });
  
  // query to retrieve P1 cases
  services.factory("searchP1cases", function($firebaseArray) {
	  return function () {
	      var casesRef = baseRef.child("cases");
	      var priorityRef = casesRef.orderByChild("priority").equalTo("1");
	      return $firebaseArray(priorityRef);
	    };
  });

  // load all users from users node
  services.factory('usersLoad', function ($firebaseArray) {
      return function () {
      var userRef = baseRef.child("users");
      return $firebaseArray(userRef);
      }
  });
  
  // update user status to admin
  services.factory('updateUserStatus', function () {
      return function (list, user) {
	      list.$save(user).then(function(){
	      console.log("Change admin status successful");
	      });
	      	
	      var adminRef = baseRef.child("admins");
	      if(user.adminFlag == true){
	      adminRef.child(user.$id).set(true);
	      }else{
	      adminRef.child(user.$id).set(null);
	      }
      }
  });
  
  // save case priority after update 
  services.factory('saveChanges', function ($q) {
      return function (allcases, caze) {
          return allcases.$save(caze);
      };
  });  
  
  //query to retrieve SLO
  services.factory("searchSLO", function($firebaseArray) {
	  return function () {
		  var sloRef = baseRef.child("slo");
		  var priorityRef = sloRef.orderByChild("priority");
		  return $firebaseArray(priorityRef);
	  };
  });

  //query to retrieve SLO
  services.factory("getSLObyPriority", function($firebaseObject) {
	  return function (caze) {
		  var sloRef = baseRef.child("slos");
		  var priorityRef = sloRef.child("P"+caze.priority);
		  return $firebaseObject(priorityRef);
	  };
  });
			
  // query to retrieve all cases
  services.factory("loadSLO", function($firebaseArray) {
	  return function () {
		  var sloRef = baseRef.child("slos");
		  return $firebaseArray(sloRef);
	  };
  });
  
  // query to retrieve all cases
  services.factory("loadSLOobject", function($firebaseObject) {
	  return function () {
		  var sloRef = baseRef.child("slos");
		  return $firebaseObject(sloRef);
	  };
  });
  
  // delete case
  services.factory("deleteSelectedCases", function () {
	  return function (cases, record) {
		  cases.$remove(record).then(function(ref) {
			  console.log("Success")
		  }, function(error) {
			  console.log("Error:", error);
		  });
	  };
  });

  // rom changes
  // Employee Services
  services.factory("EmployeeSrvcs", function ($firebaseArray, $firebaseObject, $q) {
    var employeeRef = baseRef.child('employee');
    return {
      getEmpDetails: function(data){
        var deferred = $q.defer();
        employeeRef.orderByChild("uid").equalTo(data.uid).once("value", function(dataSnapshot){
          if(dataSnapshot.exists()){
            console.log(dataSnapshot.val());
            deferred.resolve(dataSnapshot.val());
          } else {
            deferred.reject("Not found.");
          }
        });
        return deferred.promise;
      },
      getEmpList: function(data){
        return $firebaseArray(employeeRef.orderByChild("uid"));
      }

    };
  });
  
})();
