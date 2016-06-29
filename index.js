import choo from 'choo';
import naturalSort from 'javascript-natural-sort';
import stores from './stores';
import GoogleMap from './components/google-map';
import SideBar from './components/side-bar';

const app = choo();
const { computeDistanceBetween } = google.maps.geometry.spherical;
const iw = new google.maps.InfoWindow();
const geocoder = new google.maps.Geocoder();
const userMarker = new google.maps.Marker({
  animation: google.maps.Animation.DROP,
  icon: {
    path: google.maps.SymbolPath.CIRCLE,
    strokeColor: '#4285f4',
    scale: 5
  }
});

app.model({
  namespace: 'stores',
  state: {
    visibleStores: stores.sort((a, b) => naturalSort(a.name, b.name)),
    userLocation: { lat: 42.33012354634199, lng: -70.95623016357422 },
    location: ''
  },

  reducers: {
    showAll(action, state) {
      state.visibleStores = stores;
      userMarker.setMap(null);
      return state;
    },

    updateVisible(action, state) {
      state.visibleStores.forEach(store => {
        if (store.marker) {
          store.marker.setMap(null);
        }
      });
      state.visibleStores = action.payload;
      state.userLocation = action.location.toJSON();
      return state;
    },

    updateLocation(action, state) {
      state.location = action.location;
      return state;
    }
  },

  effects: {
    select(action, state, send) {
      var store = action.payload;

      iw.setPosition({ lat: store.lat, lng: store.lng });
      iw.setContent(`<b>${store.name}</b><br/>${store.address}`);
      iw.open(state.map, store.marker);
    },

    showClosest(action, state, send) {
      navigator.geolocation.getCurrentPosition(function(position) {
        var userLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
        var closest = stores.map(store => {
          let distance = computeDistanceBetween(new google.maps.LatLng(store.lat, store.lng), userLocation);
          // convert meters to miles, rounded up
          store.distance = Math.ceil(distance * 0.000621371);
          return store;
        })
          .filter(store => store.distance < 100)
          .sort((a, b) => naturalSort(a.distance, b.distance));

        if (state.map) {
          state.map.panTo(userLocation);
          state.map.setZoom(10);
          userMarker.setPosition(userLocation);
          userMarker.setMap(state.map);
        }

        send('stores:updateVisible', { payload: closest, location: userLocation });
        send('stores:geocodeLocation');
      });
    },

    geocodeLocation(action, state, send) {
      geocoder.geocode({ location: state.userLocation }, function (results, status) {
        if (status === 'OK') {
          send('stores:updateLocation', { location: results[0].formatted_address });
        }
      });
    }
  }
});


const mainView = (params, state, send) => {
  return choo.view`
    <main class="app">
      ${GoogleMap(params, state, send)}
      ${SideBar(params, state, send)}
    </main>
  `;
};


app.router((route) => {
  return [
    route('/', mainView)
  ];
});

const tree = app.start();

document.body.appendChild(tree);
