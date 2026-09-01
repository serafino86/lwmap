(function () {
  var page = document.body.dataset.page;
  if (page !== "servers") return;

  var SERVER_DATA_URL = "../assets/data/servers.json";
  var ALLIANCE_DATA_URL = "../assets/data/server-alliances.json";
  var STORAGE_KEY = "night-commando-server-filters";
  var tbody = document.getElementById("servers-body");
  var searchInput = document.getElementById("server-search");
  var regionFilter = document.getElementById("region-filter");
  var sortField = document.getElementById("sort-field");
  var dataset = [];

  function loadPrefs() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (error) {
      return {};
    }
  }

  function savePrefs() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        search: searchInput.value,
        region: regionFilter.value,
        sort: sortField.value
      })
    );
  }

  function serverDay(timestamp) {
    return Math.max(0, Math.floor((Date.now() - Number(timestamp)) / 86400000));
  }

  function mergeRows(serverRows, allianceRows) {
    var alliancesById = (allianceRows || []).reduce(function (acc, row) {
      acc[row.serverId] = row;
      return acc;
    }, {});

    return serverRows.map(function (row) {
      var allianceRow = alliancesById[Number(row.id)] || null;
      return {
        id: Number(row.id),
        server: row.server,
        region: row.region || ["unknown"],
        currentSeason: row.currentSeason || 0,
        currentWeek: row.currentWeek || 0,
        isPostSeason: Boolean(row.isPostSeason),
        day: serverDay(row.timestamp),
        alliances: allianceRow ? allianceRow.alliances : [],
        sheetUpdatedOn: allianceRow ? allianceRow.updatedOn : null
      };
    });
  }

  function populateRegions() {
    var regions = Array.from(
      new Set(
        dataset.flatMap(function (row) {
          return row.region;
        })
      )
    ).sort();

    regions.forEach(function (region) {
      var option = document.createElement("option");
      option.value = region;
      option.textContent = region;
      regionFilter.appendChild(option);
    });
  }

  function render() {
    var query = searchInput.value.trim().toLowerCase();
    var region = regionFilter.value;
    var sort = sortField.value;

    var rows = dataset.filter(function (row) {
      var searchable = [
        String(row.id),
        row.server,
        row.region.join(" "),
        row.alliances.join(" "),
        String(row.currentSeason),
        String(row.currentWeek),
        row.sheetUpdatedOn || ""
      ]
        .join(" ")
        .toLowerCase();

      return (!query || searchable.indexOf(query) !== -1) && (!region || row.region.indexOf(region) !== -1);
    });

    rows.sort(function (a, b) {
      switch (sort) {
        case "id-asc":
          return a.id - b.id;
        case "id-desc":
          return b.id - a.id;
        case "day-asc":
          return a.day - b.day;
        default:
          return b.day - a.day;
      }
    });

    tbody.innerHTML = "";
    rows.forEach(function (row) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + row.server + "</td>" +
        "<td>" + row.region.join(", ") + "</td>" +
        "<td>Season " + row.currentSeason + (row.isPostSeason ? " PS" : "") + "</td>" +
        "<td>" + row.currentWeek + "</td>" +
        "<td>" + (row.alliances.length ? row.alliances.slice(0, 4).join(", ") : "-") + "</td>" +
        "<td>Day " + row.day + "</td>";
      tbody.appendChild(tr);
    });
  }

  function init() {
    Promise.all([
      fetch(SERVER_DATA_URL, { cache: 'no-cache' }).then(function (response) {
        return response.json();
      }),
      fetch(ALLIANCE_DATA_URL, { cache: 'no-cache' }).then(function (response) {
        return response.json();
      })
    ]).then(function (results) {
      dataset = mergeRows(results[0].c || [], results[1].rows || []);
      populateRegions();

      var prefs = loadPrefs();
      searchInput.value = prefs.search || "";
      regionFilter.value = prefs.region || "";
      sortField.value = prefs.sort || "day-desc";
      render();
    });
  }

  [searchInput, regionFilter, sortField].forEach(function (node) {
    node.addEventListener("input", function () {
      savePrefs();
      render();
    });
    node.addEventListener("change", function () {
      savePrefs();
      render();
    });
  });

  init();
})();
