(function () {
  var page = document.body.dataset.page;
  if (page !== "planner") return;

  var SEASON = 6;
  var MAP_SCALE = 0.5;
  var DATASET_URLS = {
    strategic: [
      "../../assets/data/season-6-strategic-poi.json",
      "/assets/data/season-6-strategic-poi.json",
      "assets/data/season-6-strategic-poi.json"
    ],
    raw: [
      "../../assets/data/season-6-poi-points.json",
      "/assets/data/season-6-poi-points.json",
      "assets/data/season-6-poi-points.json"
    ]
  };
  var VIEWBOX_SIZE = 3000 * MAP_SCALE;
  var STORAGE_KEYS = {
    GRIDS: "area-map-grids-season-6",
    CURRENT_GRID_ID: "area-map-current-grid-id-season-6"
  };
  var SEASON_CONFIG = {
    name: "Season 6",
    resources: ["coin", "influence"],
    resourceLabels: {
      coin: "Coin/h",
      influence: "Influence"
    },
    battle: {
      slotsPerDay: 3,
      slotDurationHours: 1,
      safeTimeHours: 15,
      immuneWindowHours: 7
    },
    territory: {
      bankExpiryDays: 3,
      cityExpiryDays: 6,
      tradePostAdjacency: false
    },
    limits: {
      maxCities: 8,
      baseCities: 8,
      maxStrongholds: 12,
      baseStrongholds: 4,
      strongholdsPerCity: 1
    }
  };
  var ALLIANCE_COLORS = [
    "#8BC1F7",
    "#5752D1",
    "#4CB140",
    "#7D1007",
    "#F4C145",
    "#009596",
    "#EC7A08",
    "#FA83FC",
    "#23511E",
    "#B2B0EA",
    "#8F4700",
    "#C9190B"
  ];
  var BUFF_COLORS = {
    iron: "#ef9a9a",
    food: "#81c784",
    coin: "#ffcc80",
    gathering: "#4dd0e1",
    research: "#64b5f6",
    training: "#ce93d8",
    construction: "#f48fb1",
    healing: "#90caf9",
    march: "#a5d6a7"
  };
  var WARZONE_COLORS = [
    "#f94144",
    "#f3722c",
    "#f9c74f",
    "#90be6d",
    "#43aa8b",
    "#577590",
    "#9b5de5",
    "#f15bb5"
  ];
  var SERVER_ALLIANCE_BLUEPRINTS = [
    { name: "Main", priorityRank: 1, priorityWeight: 100, seedBanks: 2 },
    { name: "Vanguard A", priorityRank: 2, priorityWeight: 90, seedBanks: 1 },
    { name: "Vanguard B", priorityRank: 2, priorityWeight: 90, seedBanks: 1 },
    { name: "Wing 4", priorityRank: 4, priorityWeight: 78, seedBanks: 1 },
    { name: "Wing 5", priorityRank: 5, priorityWeight: 72, seedBanks: 1 },
    { name: "Wing 6", priorityRank: 6, priorityWeight: 66, seedBanks: 1 },
    { name: "Wing 7", priorityRank: 7, priorityWeight: 60, seedBanks: 0 },
    { name: "Wing 8", priorityRank: 8, priorityWeight: 54, seedBanks: 0 },
    { name: "Wing 9", priorityRank: 9, priorityWeight: 48, seedBanks: 0 },
    { name: "Wing 10", priorityRank: 10, priorityWeight: 42, seedBanks: 0 }
  ];

  var svg = document.getElementById("planner-svg");
  var board = document.querySelector(".planner-board");
  var gridLayer = document.getElementById("grid-layer");
  var elementLayer = document.getElementById("element-layer");
  var labelLayer = document.getElementById("label-layer");
  var status = document.getElementById("planner-status");
  var meta = document.getElementById("planner-meta");
  var clearButton = document.getElementById("planner-clear");
  var centerButton = document.getElementById("planner-center");
  var clearPathButton = document.getElementById("planner-clear-path");
  var simulateRouteButton = document.getElementById("planner-simulate-route");
  var warzoneSectorSelect = document.getElementById("planner-warzone-sector");
  var seedWarzoneButton = document.getElementById("planner-seed-warzone");
  var allianceRankSelect = document.getElementById("planner-alliance-rank");
  var simulationNote = document.getElementById("planner-simulation-note");
  var categoryFilter = document.getElementById("planner-category");
  var levelMinFilter = document.getElementById("planner-level-min");
  var gridSelect = document.getElementById("planner-grid-select");
  var gridNewButton = document.getElementById("planner-grid-new");
  var gridDuplicateButton = document.getElementById("planner-grid-duplicate");
  var gridDeleteButton = document.getElementById("planner-grid-delete");
  var gridExportButton = document.getElementById("planner-grid-export");
  var gridImportButton = document.getElementById("planner-grid-import");
  var gridImportFile = document.getElementById("planner-grid-import-file");
  var allianceNameInput = document.getElementById("planner-alliance-name");
  var allianceCreateButton = document.getElementById("planner-alliance-create");
  var allianceClearButton = document.getElementById("planner-alliance-clear");
  var allianceList = document.getElementById("planner-alliance-list");
  var allianceStats = document.getElementById("planner-alliance-stats");
  var setStartButton = document.getElementById("planner-set-start");
  var showStrongholds = document.getElementById("planner-show-strongholds");
  var showCities = document.getElementById("planner-show-cities");
  var showBuffs = document.getElementById("planner-show-buffs");
  var pathMode = document.getElementById("planner-path-mode");
  var selectionPanel = document.getElementById("planner-selection");
  var routePanel = document.getElementById("planner-route");
  var timelinePanel = document.getElementById("planner-timeline");
  var solutionList = document.getElementById("planner-solution-list");

  var points = [];
  var allPoints = [];
  var selectedPointId = null;
  var grids = [];
  var currentGridId = null;
  var simulationPlans = [];
  var previewPlanIndex = -1;
  var previewAllianceId = null;

  function readJson(url) {
    if (typeof fetch === "function") {
      return fetch(url).then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      });
    }

    return new Promise(function (resolve, reject) {
      var request = new XMLHttpRequest();
      request.open("GET", url, true);
      request.onreadystatechange = function () {
        if (request.readyState !== 4) return;
        if (request.status >= 200 && request.status < 300) {
          resolve(JSON.parse(request.responseText));
        } else {
          reject(new Error("HTTP " + request.status));
        }
      };
      request.onerror = function () {
        reject(new Error("Network error"));
      };
      request.send();
    });
  }

  function loadData(urls, index) {
    var current = index || 0;
    if (current >= urls.length) {
      return Promise.reject(new Error("Season 6 points dataset non raggiungibile"));
    }

    return readJson(urls[current]).catch(function () {
      return loadData(urls, current + 1);
    });
  }

  function normalizeStrategicPoint(point) {
    return {
      id: point.id,
      sourceId: point.sourceId || point.id,
      name: point.label,
      sourceName: point.label,
      category: point.category || point.type,
      label: point.label,
      shortLabel: point.shortLabel,
      level: point.level || 0,
      x: point.x,
      y: point.y,
      gridX: point.gridX,
      gridY: point.gridY,
      width: point.width || 80,
      height: point.height || 80,
      buff: point.buff || null,
      resources: point.resources || null,
      meta: point.meta || {},
      isCapitol: (point.category || point.type) === "capital"
    };
  }

  function normalizeRawPoint(point) {
    return {
      id: point.id,
      sourceId: point.sourceId || point.id,
      name: point.label || point.sourceName,
      sourceName: point.sourceName || point.label,
      category: point.category,
      label: point.label || point.sourceName,
      shortLabel: point.shortLabel,
      level: point.level || 0,
      x: point.x,
      y: point.y,
      gridX: point.gridX,
      gridY: point.gridY,
      width: point.width || 50,
      height: point.height || 50,
      buff: point.buff || null,
      resources: point.resources || null,
      meta: point.meta || {},
      isCapitol: point.category === "capital"
    };
  }

  function componentKey(point, mode) {
    if (mode === "city") return point.sourceName;
    if (mode === "bank") return String(point.level);
    return point.category;
  }

  function territoryKind(point) {
    if (point.category === "regional_zone") return "city";
    if (point.category === "road") return "city";
    if (point.category === "stronghold_territory") return "bank";
    if (point.category === "capital") return "sanctuary";
    if (point.category === "nexus") return "nexus";
    if (point.category === "outpost") return "outpost";
    if (point.category === "trade_post") return "trade_post";
    if (point.category === "fishing_ground") return "fishing_ground";
    return point.category;
  }

  function rawNeighborKeys(point, mode) {
    var stepSet = mode === "city"
      ? [[2, 0], [-2, 0], [0, 2], [0, -2]]
      : [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]];

    return stepSet.map(function (delta) {
      return String(point.gridX + delta[0]) + "," + String(point.gridY + delta[1]);
    });
  }

  function componentize(rawPoints, mode) {
    var byBucket = {};
    rawPoints.forEach(function (point) {
      var key = componentKey(point, mode);
      if (!byBucket[key]) byBucket[key] = [];
      byBucket[key].push(point);
    });

    var components = [];
    Object.keys(byBucket).forEach(function (bucketKey) {
      var bucket = byBucket[bucketKey];
      var map = {};
      bucket.forEach(function (point) {
        map[String(point.gridX) + "," + String(point.gridY)] = point;
      });
      var seen = {};

      bucket.forEach(function (point) {
        var startKey = String(point.gridX) + "," + String(point.gridY);
        if (seen[startKey]) return;

        var queue = [point];
        var cells = [];
        seen[startKey] = true;

        while (queue.length) {
          var current = queue.shift();
          cells.push(current);
          rawNeighborKeys(current, mode).forEach(function (neighborKey) {
            if (map[neighborKey] && !seen[neighborKey]) {
              seen[neighborKey] = true;
              queue.push(map[neighborKey]);
            }
          });
        }

        components.push(cells);
      });
    });

    return components;
  }

  function aggregateComponent(cells, kind, name, level, strategicId) {
    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;
    var totalX = 0;
    var totalY = 0;
    var coin = 0;
    var influence = 0;
    var buff = null;

    cells.forEach(function (cell) {
      var left = cell.x - (cell.width || 50) / 2;
      var right = cell.x + (cell.width || 50) / 2;
      var top = cell.y - (cell.height || 50) / 2;
      var bottom = cell.y + (cell.height || 50) / 2;
      if (left < minX) minX = left;
      if (right > maxX) maxX = right;
      if (top < minY) minY = top;
      if (bottom > maxY) maxY = bottom;
      totalX += cell.x;
      totalY += cell.y;
      if (cell.resources) {
        coin += cell.resources.coin || 0;
        influence += cell.resources.influence || 0;
      }
      if (!buff && cell.buff) buff = cell.buff;
    });

    var first = cells[0];
    var id = strategicId || ("territory-" + kind + "-" + level + "-" + slug());
    return {
      id: id,
      sourceId: first.sourceId,
      name: name,
      sourceName: name,
      category: first.category,
      territoryKind: kind,
      label: name,
      shortLabel: first.shortLabel || name,
      level: level,
      x: totalX / cells.length,
      y: totalY / cells.length,
      gridX: cells[0].gridX,
      gridY: cells[0].gridY,
      width: maxX - minX,
      height: maxY - minY,
      cells: cells,
      buff: buff,
      resources: coin || influence ? { coin: coin, influence: influence } : null,
      meta: first.meta || {},
      isCapitol: kind === "sanctuary"
    };
  }

  function buildPlannerPoints(strategicData, rawData) {
    var rawPoints = (rawData.poi || rawData.points || []).map(normalizeRawPoint);
    var strategicPoints = (strategicData.poi || strategicData.points || []).map(normalizeStrategicPoint);
    var strategicById = {};
    strategicPoints.forEach(function (point) {
      strategicById[point.id] = point;
    });

    return rawPoints.map(function (point) {
      var strategic = strategicById[point.id];
      return Object.assign({}, point, strategic ? {
        name: strategic.name || point.name,
        label: strategic.label || point.label,
        shortLabel: strategic.shortLabel || point.shortLabel
      } : null, {
        territoryKind: territoryKind(point),
        cells: null
      });
    });
  }

  function buildAllPoints(strategicData, rawData) {
    return buildPlannerPoints(strategicData, rawData);
  }

  function saveJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Storage save error:", error);
    }
  }

  function loadJson(key, fallback) {
    try {
      var value = localStorage.getItem(key);
      if (value) return JSON.parse(value);
    } catch (error) {
      console.error("Storage load error:", error);
    }
    return fallback;
  }

  function slug() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function defaultGrid(name) {
    return {
      id: "s5-" + slug(),
      name: name || "Season 6 - Main Server",
      alliances: [],
      pathSteps: [],
      showStrongholds: false,
      showCities: true,
      showBuffs: false,
      proposedPathMode: false,
      selectedAllianceId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function normalizeAlliance(alliance, index) {
    var safeSlot = alliance && alliance.safeTimeSlot ? Number(alliance.safeTimeSlot) : 2;
    if (safeSlot < 1 || safeSlot > SEASON_CONFIG.battle.slotsPerDay) safeSlot = 2;
    return {
      id: alliance && alliance.id ? alliance.id : "ally-restored-" + index + "-" + slug(),
      name: alliance && alliance.name ? alliance.name : "Alliance " + (index + 1),
      areaIds: Array.isArray(alliance && alliance.areaIds) ? alliance.areaIds : [],
      color: alliance && alliance.color ? alliance.color : ALLIANCE_COLORS[index % ALLIANCE_COLORS.length],
      safeTimeHours: alliance && alliance.safeTimeHours ? Number(alliance.safeTimeHours) : SEASON_CONFIG.battle.safeTimeHours,
      safeTimeSlot: safeSlot,
      priorityRank: alliance && alliance.priorityRank ? Number(alliance.priorityRank) : (index + 1),
      priorityWeight: alliance && alliance.priorityWeight ? Number(alliance.priorityWeight) : Math.max(1, 100 - index * 5),
      serverSector: alliance && alliance.serverSector ? Number(alliance.serverSector) : null
    };
  }

  function drawGrid() {
    svg.setAttribute("viewBox", "0 0 " + VIEWBOX_SIZE + " " + VIEWBOX_SIZE);

    for (var x = 0; x <= VIEWBOX_SIZE; x += 50) {
      var vx = document.createElementNS("http://www.w3.org/2000/svg", "line");
      vx.setAttribute("x1", x);
      vx.setAttribute("y1", 0);
      vx.setAttribute("x2", x);
      vx.setAttribute("y2", VIEWBOX_SIZE);
      vx.setAttribute("stroke", x % 250 === 0 ? "rgba(118,255,3,0.18)" : "rgba(114,116,119,0.14)");
      gridLayer.appendChild(vx);
    }

    for (var y = 0; y <= VIEWBOX_SIZE; y += 50) {
      var hy = document.createElementNS("http://www.w3.org/2000/svg", "line");
      hy.setAttribute("x1", 0);
      hy.setAttribute("y1", y);
      hy.setAttribute("x2", VIEWBOX_SIZE);
      hy.setAttribute("y2", y);
      hy.setAttribute("stroke", y % 250 === 0 ? "rgba(118,255,3,0.18)" : "rgba(114,116,119,0.14)");
      gridLayer.appendChild(hy);
    }
  }

  function currentGrid() {
    return grids.find(function (grid) {
      return grid.id === currentGridId;
    }) || null;
  }

  function currentAlliance() {
    var grid = currentGrid();
    if (!grid || !grid.selectedAllianceId) return null;
    return grid.alliances.find(function (alliance) {
      return alliance.id === grid.selectedAllianceId;
    }) || null;
  }

  function updateGrid(id, patch) {
    grids = grids.map(function (grid) {
      if (grid.id !== id) return grid;
      return Object.assign({}, grid, patch, { updatedAt: new Date().toISOString() });
    });
    persistGridState();
  }

  function persistGridState() {
    saveJson(STORAGE_KEYS.GRIDS, grids);
    saveJson(STORAGE_KEYS.CURRENT_GRID_ID, currentGridId);
    syncGridControls();
    syncGridSettings();
    render();
  }

  function syncGridControls() {
    var grid = currentGrid();
    gridSelect.innerHTML = "";
    grids.forEach(function (item) {
      var option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.name;
      gridSelect.appendChild(option);
    });
    if (grid) gridSelect.value = grid.id;
    gridDuplicateButton.disabled = !grid;
    gridDeleteButton.disabled = grids.length <= 1;
  }

  function syncGridSettings() {
    var grid = currentGrid();
    if (!grid) return;
    showStrongholds.checked = !!grid.showStrongholds;
    showCities.checked = grid.showCities !== false;
    showBuffs.checked = !!grid.showBuffs;
    pathMode.checked = !!grid.proposedPathMode;
  }

  function syncAlliancePanel() {
    var grid = currentGrid();
    var selectedAlliance = currentAlliance();
    var allianceItems = grid && grid.alliances ? grid.alliances.slice().sort(function (a, b) {
      return (b.priorityWeight || 0) - (a.priorityWeight || 0) || (a.priorityRank || 0) - (b.priorityRank || 0) || a.name.localeCompare(b.name);
    }) : [];

    allianceList.innerHTML = "";
    if (!grid || !allianceItems.length) {
      allianceList.innerHTML = '<div class="route-empty">No alliances yet.</div>';
    } else {
      allianceItems.forEach(function (alliance) {
        var counts = computeAllianceCounts(alliance);
        var row = document.createElement("div");
        row.className = "alliance-row" + (selectedAlliance && selectedAlliance.id === alliance.id ? " is-active" : "");
        row.innerHTML =
          '<button class="alliance-chip" type="button" data-action="select" data-id="' + alliance.id + '">' +
            '<span class="alliance-color" style="background:' + alliance.color + '"></span>' +
            '<strong>' + alliance.name + "</strong>" +
            (startAreaForAlliance(alliance) ? '<span class="alliance-start-flag">START</span>' : "") +
            '<span class="palette-note">P' + (alliance.priorityRank || "-") + (alliance.serverSector ? ' · WZ' + alliance.serverSector : '') + "</span>" +
            '<span class="palette-note">' + counts.cities.current + "/" + counts.cities.max + " cities · " +
            counts.strongholds.current + "/" + counts.strongholds.max + " strongholds</span>" +
          "</button>" +
          '<button class="alliance-delete" type="button" data-action="delete" data-id="' + alliance.id + '">×</button>';
        allianceList.appendChild(row);
      });
    }

    if (!selectedAlliance) {
      allianceStats.innerHTML = "<strong>No alliance selected</strong><span class=\"palette-note\">Select an alliance to claim areas or build a conquest path.</span>";
      return;
    }

    var selectedCounts = computeAllianceCounts(selectedAlliance);
    var resourceTotals = sumAllianceResources(selectedAlliance);
    var startArea = startAreaForAlliance(selectedAlliance);
    allianceStats.innerHTML =
      "<strong>" + selectedAlliance.name + "</strong>" +
      "<span class=\"palette-note\">Priority P" + (selectedAlliance.priorityRank || "-") + " · Weight " + (selectedAlliance.priorityWeight || "-") + (selectedAlliance.serverSector ? " · WZ" + selectedAlliance.serverSector : "") + "</span>" +
      "<span class=\"palette-note\">Cities " + selectedCounts.cities.current + "/" + selectedCounts.cities.max +
      " · Strongholds " + selectedCounts.strongholds.current + "/" + selectedCounts.strongholds.max + "</span>" +
      "<span class=\"palette-note\">" + SEASON_CONFIG.resourceLabels.coin + " " + resourceTotals.coin +
      " · " + SEASON_CONFIG.resourceLabels.influence + " " + resourceTotals.influence + "</span>" +
      "<span class=\"palette-note\">Battle slots/day " + SEASON_CONFIG.battle.slotsPerDay + " · Safe time " + (selectedAlliance.safeTimeHours || SEASON_CONFIG.battle.safeTimeHours) + "h · Preferred slot S" + (selectedAlliance.safeTimeSlot || 2) + "</span>" +
      "<span class=\"palette-note\">Starting territory " + (startArea ? pointName(startArea) + " Lv." + startArea.level : "not set") + "</span>";
  }

  function pointById(id) {
    return allPoints.find(function (point) {
      return point.id === id;
    }) || null;
  }

  function pointName(point) {
    return point.name || point.label || point.sourceName;
  }

  function scaledValue(value) {
    return value * MAP_SCALE;
  }

  function scaledWidth(point) {
    return Math.max(12, scaledValue(point.width || 50));
  }

  function scaledHeight(point) {
    return Math.max(12, scaledValue(point.height || 50));
  }

  function scaledCenter(point) {
    return {
      x: scaledValue(point.x),
      y: scaledValue(point.y)
    };
  }

  function pointAbbreviation(point) {
    var abbreviations = {
      "Bank Stronghold": "BK",
      "Trade Post": "TP",
      "Warzone Outpost": "WO",
      "Wetland Assembly": "WA",
      "Deepwood Assembly": "DA",
      "Wetland Sanctuary": "WS",
      "Deepwood Sanctuary": "DS",
      
      "Coyote Town": "CT",
      "Waterhold": "WH",
      "Derby Grounds": "DG",
      "Sand County": "SC",
      "Lawless Road": "LR"
    };
    return abbreviations[pointName(point)] || point.shortLabel || pointName(point);
  }

  function assignedAlliance(pointId) {
    var grid = currentGrid();
    if (!grid) return null;
    return grid.alliances.find(function (alliance) {
      return alliance.areaIds.indexOf(pointId) !== -1;
    }) || null;
  }

  function startAreaIdForAlliance(alliance) {
    return alliance && Array.isArray(alliance.areaIds) && alliance.areaIds.length ? alliance.areaIds[0] : null;
  }

  function startAreaForAlliance(alliance) {
    var startId = startAreaIdForAlliance(alliance);
    return startId ? pointById(startId) : null;
  }

  function isAllianceStartArea(pointId, alliance) {
    return !!alliance && startAreaIdForAlliance(alliance) === pointId;
  }

  function selectedAllianceStartsOn(pointId) {
    return isAllianceStartArea(pointId, currentAlliance());
  }

  function anyAllianceStartsOn(pointId) {
    var grid = currentGrid();
    if (!grid) return false;
    return grid.alliances.some(function (alliance) {
      return isAllianceStartArea(pointId, alliance);
    });
  }

  function canAllianceAbsorbTerritory(activeAlliance, ownerAlliance) {
    if (!activeAlliance || !ownerAlliance) return false;
    if (activeAlliance.id === ownerAlliance.id) return true;
    if (!activeAlliance.serverSector || !ownerAlliance.serverSector) return false;
    if (activeAlliance.serverSector !== ownerAlliance.serverSector) return false;
    return (activeAlliance.priorityWeight || 0) > (ownerAlliance.priorityWeight || 0);
  }

  function territoryOccupancyForAlliance(pointId, activeAlliance) {
    var owner = assignedAlliance(pointId);
    if (!owner || !activeAlliance || owner.id === activeAlliance.id) return "free";
    if (canAllianceAbsorbTerritory(activeAlliance, owner)) return "transferable";
    return "blocked";
  }

  function fillColor(point) {
    var grid = currentGrid();
    var owner = assignedAlliance(point.id);

    if (grid && grid.showBuffs && point.buff && BUFF_COLORS[point.buff.item]) {
      return BUFF_COLORS[point.buff.item];
    }

    if (owner) return owner.color;

    switch (point.territoryKind || point.category) {
      case "sanctuary":
        return "#ffd54f";
      case "nexus":
        return "#64b5f6";
      case "outpost":
        return "#ef5350";
      case "trade_post":
        return "#ffb74d";
      case "fishing_ground":
        return "#ce93d8";
      case "city":
        if (point.category === "road" || pointName(point) === "Lawless Road") return "#b0a36b";
        if (pointName(point) === "Coyote Town") return "#6fa8dc";
        if (pointName(point) === "Waterhold") return "#4fc3f7";
        if (pointName(point) === "Derby Grounds") return "#81c784";
        if (pointName(point) === "Sand County") return "#d4a55a";
        return "#90a4ae";
      case "bank":
        return ["#385723", "#466b2c", "#5b8337", "#6d9941", "#8bc34a", "#a5d85c", "#bfe97a", "#d7f095", "#ecf7bf", "#f5ffd7"][Math.max(0, point.level - 1)] || "#8bc34a";
      default:
        return "#607d8b";
    }
  }

  function fillOpacity(point) {
    if (assignedAlliance(point.id)) return 0.92;
    switch (point.territoryKind || point.category) {
      case "sanctuary":
      case "nexus":
      case "outpost":
        return 0.98;
      case "trade_post":
        return 0.94;
      case "fishing_ground":
        return 0.92;
      case "city":
        return 0.9;
      case "bank":
        return 0.4;
      default:
        return 0.72;
    }
  }

  function markerRadius(point) {
    switch (point.category) {
      case "capital":
        return 34;
      case "nexus":
        return 24;
      case "outpost":
        return 20;
      default:
        return 18;
    }
  }

  function center(point) {
    return scaledCenter(point);
  }

  function pointCategoryVisible(point) {
    var selectedCategory = categoryFilter.value;
    var minLevel = Number(levelMinFilter.value || 0);
    var category = point.territoryKind === "city" ? "regional_zone"
      : point.territoryKind === "bank" ? "stronghold_territory"
      : point.category;
    return (!selectedCategory || category === selectedCategory) && point.level >= minLevel;
  }

  function isAssignable(point) {
    return point.territoryKind === "city" || point.territoryKind === "bank";
  }

  function filteredPoints() {
    return points.filter(pointCategoryVisible);
  }

  function isCity(point) {
    return point.territoryKind === "city";
  }

  function computeAllianceCounts(alliance) {
    var owned = alliance.areaIds.map(pointById).filter(Boolean);
    var cityCount = owned.filter(isCity).length;
    var strongholdCount = owned.filter(function (point) {
      return point.territoryKind === "bank";
    }).length;
    var allowedStrongholds = strongholdCapacityForOwnedPoints(owned);
    return {
      cities: {
        current: cityCount,
        max: SEASON_CONFIG.limits.maxCities
      },
      strongholds: {
        current: strongholdCount,
        max: allowedStrongholds
      }
    };
  }

  function strongholdCapacityForOwnedPoints(ownedPoints) {
    var cityCount = ownedPoints.filter(isCity).length;
    var level6CityCount = ownedPoints.filter(function (point) {
      return point.territoryKind === "city" && point.level === 6;
    }).length;
    return Math.min(
      SEASON_CONFIG.limits.baseStrongholds +
        (cityCount - level6CityCount) * (SEASON_CONFIG.limits.strongholdsPerCity || 0) +
        level6CityCount * (SEASON_CONFIG.limits.strongholdsPerLevel6City || 2),
      SEASON_CONFIG.limits.maxStrongholds
    );
  }

  function sumAllianceResources(alliance) {
    var totals = { coin: 0, influence: 0 };
    alliance.areaIds.forEach(function (pointId) {
      var point = pointById(pointId);
      if (!point || !point.resources) return;
      Object.keys(totals).forEach(function (key) {
        totals[key] += point.resources[key] || 0;
      });
    });
    return totals;
  }

  function pointSummary(point) {
    var owner = assignedAlliance(point.id);
    var resourceText = !point.resources
      ? "No resource production"
      : Object.keys(point.resources).map(function (key) {
          return key + ": " + point.resources[key];
        }).join(" · ");
    var buffText = point.buff ? point.buff.item + " +" + point.buff.percentage + "%" : "No buff";

    return (
      "<strong>" + pointName(point) + " Lv." + point.level + "</strong>" +
      "<span class=\"palette-note\">ID " + point.id + " · " + (point.territoryKind || point.category) + "</span>" +
      "<span class=\"palette-note\">Grid " + point.gridX + ", " + point.gridY + "</span>" +
      "<span class=\"palette-note\">Warzone sector WZ" + warzoneSectorForPoint(point) + "</span>" +
      "<span class=\"palette-note\">Type " + pointName(point) + "</span>" +
      "<span class=\"palette-note\">" + buffText + "</span>" +
      "<span class=\"palette-note\">" + resourceText + "</span>" +
      "<span class=\"palette-note\">Owner " + (owner ? owner.name : "Unassigned") + "</span>"
    );
  }

  function centerBoardOn(point) {
    if (!board || !point) return;
    var rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    var pos = scaledCenter(point);
    var scaleX = rect.width / VIEWBOX_SIZE;
    var scaleY = rect.height / VIEWBOX_SIZE;
    var left = Math.max(0, pos.x * scaleX - board.clientWidth / 2);
    var top = Math.max(0, pos.y * scaleY - board.clientHeight / 2);

    board.scrollLeft = left;
    board.scrollTop = top;
  }

  function focusGoldenPalace() {
    var palace = pointById("poi:I61");
    if (!palace) return;
    centerBoardOn(palace);
  }

  function manhattanDistance(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  function isTraversalPoint(point) {
    return point.territoryKind === "sanctuary" ||
      point.territoryKind === "nexus" ||
      point.territoryKind === "city" ||
      point.territoryKind === "bank";
  }

  function graphNeighbors(point, collection) {
    return collection.filter(function (candidate) {
      return candidate.id !== point.id && pointsAdjacent(point, candidate);
    });
  }

  function shortestPath(startId, targetId, collection) {
    var traversable = collection.filter(isTraversalPoint);
    var map = {};
    traversable.forEach(function (point) {
      map[point.id] = point;
    });
    if (!map[startId] || !map[targetId]) return [];

    var queue = [startId];
    var previous = {};
    var visited = {};
    visited[startId] = true;

    while (queue.length) {
      var currentId = queue.shift();
      if (currentId === targetId) break;
      graphNeighbors(map[currentId], traversable).forEach(function (neighbor) {
        if (visited[neighbor.id]) return;
        visited[neighbor.id] = true;
        previous[neighbor.id] = currentId;
        queue.push(neighbor.id);
      });
    }

    if (!visited[targetId]) return [];

    var path = [];
    var cursor = targetId;
    while (cursor) {
      path.unshift(cursor);
      cursor = previous[cursor];
      if (cursor === startId) {
        path.unshift(cursor);
        break;
      }
    }
    return path;
  }

  function pointsAdjacent(a, b) {
    if (!a || !b) return false;
    var aLeft = a.x - (a.width || 50) / 2;
    var aRight = a.x + (a.width || 50) / 2;
    var aTop = a.y - (a.height || 50) / 2;
    var aBottom = a.y + (a.height || 50) / 2;
    var bLeft = b.x - (b.width || 50) / 2;
    var bRight = b.x + (b.width || 50) / 2;
    var bTop = b.y - (b.height || 50) / 2;
    var bBottom = b.y + (b.height || 50) / 2;
    var overlapX = Math.min(aRight, bRight) - Math.max(aLeft, bLeft);
    var overlapY = Math.min(aBottom, bBottom) - Math.max(aTop, bTop);
    var epsilon = 0.001;

    if (overlapX > epsilon && overlapY > epsilon) return true;

    var sharesVerticalEdge =
      (Math.abs(aRight - bLeft) <= epsilon || Math.abs(bRight - aLeft) <= epsilon) &&
      overlapY > epsilon;
    if (sharesVerticalEdge) return true;

    var sharesHorizontalEdge =
      (Math.abs(aBottom - bTop) <= epsilon || Math.abs(bBottom - aTop) <= epsilon) &&
      overlapX > epsilon;
    return sharesHorizontalEdge;
  }

  function palaceZonePoints() {
    var palace = pointById("poi:I61");
    if (!palace) return [];
    return allPoints.filter(function (point) {
      return point.id === palace.id ||
        (point.category === "fishing_ground" && pointsAdjacent(point, palace));
    });
  }

  function adjacentToPalaceZone(point) {
    return palaceZonePoints().some(function (zonePoint) {
      return pointsAdjacent(point, zonePoint);
    });
  }

  function distanceToPalaceZone(point) {
    return palaceZonePoints().reduce(function (best, zonePoint) {
      return Math.min(best, manhattanDistance(point, zonePoint));
    }, Infinity);
  }

  function uniquePathIds(pathIds) {
    var seen = {};
    return pathIds.filter(function (id) {
      if (seen[id]) return false;
      seen[id] = true;
      return true;
    });
  }

  function cityOpportunityScore(point) {
    if (!point || !isCity(point)) return 0;
    var score = pointResourceScore(point);
    if (pointName(point) === "Lawless Road") score -= 120000;
    if (point.level >= 4) score += 80000;
    if (point.level >= 6) score += 140000;
    return score;
  }

  function sharedCityCandidates(fromPoint, toPoint, routeIds) {
    var seen = {};
    routeIds.forEach(function (id) { seen[id] = true; });
    return allPoints
      .filter(function (point) {
        return isCity(point) &&
          !seen[point.id] &&
          pointsAdjacent(fromPoint, point) &&
          pointsAdjacent(toPoint, point);
      })
      .sort(function (a, b) {
        return cityOpportunityScore(b) - cityOpportunityScore(a);
      });
  }

  function buildRouteVariant(baseRouteIds, style) {
    if (style === "direct") return baseRouteIds.slice();

    var variant = [baseRouteIds[0]];
    for (var index = 0; index < baseRouteIds.length - 1; index += 1) {
      var currentPoint = pointById(baseRouteIds[index]);
      var nextPoint = pointById(baseRouteIds[index + 1]);
      var sharedCities = sharedCityCandidates(currentPoint, nextPoint, variant.concat(baseRouteIds));
      if (sharedCities.length) {
        if (style === "city-heavy") {
          sharedCities.slice(0, 1).forEach(function (point) {
            variant.push(point.id);
          });
        } else if (style === "safe") {
          if (index % 3 === 1 && cityOpportunityScore(sharedCities[0]) >= 250000) {
            variant.push(sharedCities[0].id);
          }
        } else if (style === "cannon-heavy") {
          if (index % 2 === 1 && cityOpportunityScore(sharedCities[0]) >= 180000) {
            variant.push(sharedCities[0].id);
          }
        }
      }
      variant.push(baseRouteIds[index + 1]);
    }
    return uniquePathIds(variant);
  }

  function centralBankStrongholds() {
    return allPoints
      .filter(function (point) {
        return point.territoryKind === "bank" && point.level === 10 && adjacentToPalaceZone(point);
      })
      .sort(function (a, b) {
        return distanceToPalaceZone(a) - distanceToPalaceZone(b);
      });
  }

  function cannonOutposts() {
    var palace = allPoints.find(function (point) { return point.category === "capital"; });
    return allPoints
      .filter(function (point) {
        return point.category === "outpost" && manhattanDistance(point, palace) <= 550;
      })
      .sort(function (a, b) {
        return manhattanDistance(a, palace) - manhattanDistance(b, palace);
      });
  }

  function outpostAdjacentEntries(sectorId) {
    var outposts = allPoints.filter(function (p) { return p.category === "outpost"; });
    var sectorOutpost = outposts.filter(function (p) { return warzoneSectorForPoint(p) === sectorId; })[0];
    var targetOutpost = sectorOutpost || outposts[0];
    if (!targetOutpost) return [];
    return allPoints
      .filter(function (p) {
        return p.territoryKind === "bank" && pointsAdjacent(p, targetOutpost);
      })
      .sort(function (a, b) { return b.level - a.level; })
      .map(function (entry) { return { entry: entry, targetOutpost: targetOutpost }; });
  }

  function contaminatedLandPoints() {
    var palace = allPoints.find(function (point) { return point.category === "capital"; });
    return allPoints.filter(function (point) {
      return manhattanDistance(point, palace) <= 950;
    });
  }

  function pointSide(point, palace) {
    var dx = point.x - palace.x;
    var dy = point.y - palace.y;
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "east" : "west";
    return dy >= 0 ? "south" : "north";
  }

  function warzoneSectorForPoint(point) {
    var palace = pointById("poi:I61");
    if (!point || !palace) return 1;
    var angle = (Math.atan2(point.y - palace.y, point.x - palace.x) + (Math.PI * 2)) % (Math.PI * 2);
    return Math.floor(((angle + (Math.PI / 8)) % (Math.PI * 2)) / (Math.PI / 4)) + 1;
  }

  function isWarzoneStartPoint(point) {
    return !!point && isCity(point) && point.level <= 2;
  }

  function warzoneStartPoints(sectorId) {
    return allPoints
      .filter(isWarzoneStartPoint)
      .filter(function (point) { return warzoneSectorForPoint(point) === sectorId; })
      .sort(function (a, b) { return a.y - b.y || a.x - b.x; });
  }

  function warzoneBounds(sectorId) {
    var pointsInSector = warzoneStartPoints(sectorId);
    if (!pointsInSector.length) return null;
    var padding = 70;
    var minX = Math.min.apply(null, pointsInSector.map(function (point) { return point.x - (point.width || 50) / 2; })) - padding;
    var maxX = Math.max.apply(null, pointsInSector.map(function (point) { return point.x + (point.width || 50) / 2; })) + padding;
    var minY = Math.min.apply(null, pointsInSector.map(function (point) { return point.y - (point.height || 50) / 2; })) - padding;
    var maxY = Math.max.apply(null, pointsInSector.map(function (point) { return point.y + (point.height || 50) / 2; })) + padding;
    return {
      sectorId: sectorId,
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  function preferredWarzoneSector() {
    var alliance = currentAlliance();
    var startArea = startAreaForAlliance(alliance);
    if (startArea) return warzoneSectorForPoint(startArea);
    return Number(warzoneSectorSelect && warzoneSectorSelect.value ? warzoneSectorSelect.value : 6);
  }

  function evenlySpacedPoints(pointsList, count) {
    if (pointsList.length <= count) return pointsList.slice();
    var results = [];
    for (var index = 0; index < count; index += 1) {
      var pointIndex = Math.round(index * (pointsList.length - 1) / Math.max(1, count - 1));
      results.push(pointsList[pointIndex]);
    }
    return uniquePathIds(results.map(function (point) { return point.id; })).map(pointById).filter(Boolean);
  }

  function seedBankCandidates(startPoint, usedIds) {
    return allPoints
      .filter(function (point) {
        return point.territoryKind === "bank" &&
          warzoneSectorForPoint(point) === warzoneSectorForPoint(startPoint) &&
          pointsAdjacent(startPoint, point) &&
          usedIds.indexOf(point.id) === -1;
      })
      .sort(function (a, b) {
        return a.level - b.level || manhattanDistance(a, startPoint) - manhattanDistance(b, startPoint);
      });
  }

  function createWarzoneAlliancePreset() {
    var grid = currentGrid();
    if (!grid) return;

    var sectorId = Number(warzoneSectorSelect && warzoneSectorSelect.value ? warzoneSectorSelect.value : 6);
    var startPoints = evenlySpacedPoints(warzoneStartPoints(sectorId), SERVER_ALLIANCE_BLUEPRINTS.length);
    if (startPoints.length < SERVER_ALLIANCE_BLUEPRINTS.length) {
      setSimulationNote("Not enough start points found for Warzone " + sectorId + ".");
      return;
    }

    var usedIds = [];
    var alliances = SERVER_ALLIANCE_BLUEPRINTS.map(function (blueprint, index) {
      var startPoint = startPoints[index];
      var areaIds = [startPoint.id];
      usedIds.push(startPoint.id);

      seedBankCandidates(startPoint, usedIds).slice(0, blueprint.seedBanks).forEach(function (bankPoint) {
        areaIds.push(bankPoint.id);
        usedIds.push(bankPoint.id);
      });

      return {
        id: "ally-" + slug(),
        name: "WZ" + sectorId + " " + blueprint.name,
        areaIds: areaIds,
        color: ALLIANCE_COLORS[index % ALLIANCE_COLORS.length],
        safeTimeHours: SEASON_CONFIG.battle.safeTimeHours,
        safeTimeSlot: Math.min(SEASON_CONFIG.battle.slotsPerDay, (index % SEASON_CONFIG.battle.slotsPerDay) + 1),
        priorityRank: blueprint.priorityRank,
        priorityWeight: blueprint.priorityWeight,
        serverSector: sectorId
      };
    }).sort(function (a, b) {
      return (b.priorityWeight || 0) - (a.priorityWeight || 0) || a.name.localeCompare(b.name);
    });

    clearSimulationPreview();
    updateGrid(grid.id, {
      alliances: alliances,
      pathSteps: [],
      selectedAllianceId: alliances[0] ? alliances[0].id : null
    });

    setSimulationNote(
      "Generated 10 alliances for Warzone " + sectorId + ". Priority order: Main first, Vanguard A/B tied, then descending supporting wings."
    );
  }

  function allianceFrontier(alliance) {
    var owned = alliance.areaIds.map(pointById).filter(Boolean);
    if (owned.length) {
      return owned[0];
    }

    return allPoints
      .filter(function (point) { return point.territoryKind === "city" && point.level <= 2; })
      .sort(function (a, b) {
        return manhattanDistance(a, pointById("poi:I61")) - manhattanDistance(b, pointById("poi:I61"));
      })[0] || null;
  }

  function allianceHasGoldenPalaceAccess(alliance) {
    return alliance.areaIds.map(pointById).filter(Boolean).some(function (point) {
      return point.level >= 10 &&
        (point.territoryKind === "bank" || isCity(point)) &&
        adjacentToPalaceZone(point);
    });
  }

  function chooseSimulationTargets(rank, entryPoint, style) {
    var palace = allPoints.find(function (point) { return point.category === "capital"; });
    var cannons = cannonOutposts().sort(function (a, b) {
      return manhattanDistance(a, entryPoint) - manhattanDistance(b, entryPoint);
    });

    if (style === "cannon-heavy") {
      return cannons.slice(0, 2).concat([palace]);
    }
    if (style === "safe") {
      return cannons.slice(0, 1).concat([palace]);
    }
    if (style === "direct") {
      return [palace];
    }

    if (rank === "elite") {
      return cannons.slice(0, 2).concat([palace]);
    }
    if (rank === "contender") {
      return cannons.slice(0, 1).concat([palace]);
    }
    return [palace];
  }

  function simulationProfiles(rank) {
    if (rank === "elite") {
      return [
        { key: "via-nexus", label: "Via Assembly" },
        { key: "safe", label: "Balanced Push" },
        { key: "cannon-heavy", label: "Cannon Control" },
        { key: "direct", label: "Direct Breach" },
        { key: "outpost-control", label: "Outpost Raid" }
      ];
    }
    if (rank === "contender") {
      return [
        { key: "safe", label: "Balanced Push" },
        { key: "direct", label: "Direct Breach" },
        { key: "cannon-heavy", label: "Cannon Pressure" },
        { key: "outpost-control", label: "Outpost Raid" }
      ];
    }
    return [
      { key: "direct", label: "Low Risk Push" },
      { key: "safe", label: "Opportunistic Cannon" },
      { key: "outpost-control", label: "Outpost Raid" }
    ];
  }

  function setSimulationNote(message) {
    if (!simulationNote) return;
    // Le regole di conquista Season 6 non sono ancora state trascritte dalla guida
    // pubblica: finche` non lo sono, qui non va scritto nessun numero, per non
    // spacciare le finestre di attacco della Season 6 per regole valide.
    simulationNote.innerHTML =
      "<strong>Season 6 conquest rules</strong>" +
      "<span class=\"palette-note\">" + message + "</span>" +
      "<span class=\"palette-note\">⚠ Regole Season 6 da trascrivere: finestre di attacco, condizione di adiacenza ai Sanctuary, influence per obiettivo, scadenze territori. Vedi docs/season6-data-method.md.</span>";
  }

  function resourceTotalsForPath(routeIds) {
    var totals = { coin: 0, influence: 0 };
    routeIds.map(pointById).filter(Boolean).forEach(function (point) {
      if (!point.resources) return;
      totals.coin += point.resources.coin || 0;
      totals.influence += point.resources.influence || 0;
    });
    return totals;
  }

  function routeCategoryCounts(routeIds) {
    var counts = {
      cities: 0,
      banks: 0,
      palace: 0
    };

    routeIds.map(pointById).filter(Boolean).forEach(function (point) {
      if (isCity(point)) counts.cities += 1;
      if (point.territoryKind === "bank") counts.banks += 1;
      if (point.territoryKind === "sanctuary") counts.palace += 1;
    });

    return counts;
  }

  function isWarDay(day) {
    var weekday = ((day - 1) % 7) + 1;
    return weekday === 3 || weekday === 6;
  }

  function pointResourceScore(point) {
    if (!point || !point.resources) return point && point.level ? point.level * 100 : 0;
    return (point.resources.influence || 0) + ((point.resources.coin || 0) * 1000) + ((point.level || 0) * 100);
  }

  function releaseCandidate(ownedIds, remainingRouteIds, alliance, kind) {
    var protectedIds = {};
    remainingRouteIds.forEach(function (id) {
      protectedIds[id] = true;
    });
    var startId = startAreaIdForAlliance(alliance);
    if (startId) protectedIds[startId] = true;

    return ownedIds
      .map(pointById)
      .filter(Boolean)
      .filter(function (point) {
        return point.territoryKind === kind && !protectedIds[point.id];
      })
      .sort(function (a, b) {
        return pointResourceScore(a) - pointResourceScore(b) || a.level - b.level;
      })[0] || null;
  }

  function protectedKeepIds(state, desiredRouteIds, alliance) {
    var protectedIds = {};
    var nextDesired = desiredRouteIds
      .filter(function (id) { return state.ownedIds.indexOf(id) === -1; })
      .slice(0, 4);
    nextDesired.forEach(function (id) { protectedIds[id] = true; });

    state.ownedIds.forEach(function (ownedId) {
      var ownedPoint = pointById(ownedId);
      if (!ownedPoint) return;
      nextDesired.forEach(function (targetId) {
        var targetPoint = pointById(targetId);
        if (targetPoint && pointsAdjacent(ownedPoint, targetPoint)) {
          protectedIds[ownedId] = true;
        }
      });
    });

    var startId = startAreaIdForAlliance(alliance);
    if (startId) protectedIds[startId] = true;
    return protectedIds;
  }

  function classifyOwnedTerritories(state, desiredRouteIds, alliance) {
    var keepIds = protectedKeepIds(state, desiredRouteIds, alliance);
    var classes = {};
    state.ownedIds.forEach(function (ownedId) {
      var point = pointById(ownedId);
      if (!point) return;
      if (keepIds[ownedId]) {
        classes[ownedId] = "keep";
      } else if (pointResourceScore(point) >= 450000) {
        classes[ownedId] = "yield";
      } else {
        classes[ownedId] = "release-candidate";
      }
    });
    return classes;
  }

  function ownedPointsFromIds(ownedIds) {
    return ownedIds.map(pointById).filter(Boolean);
  }

  function createAllianceDayState(alliance) {
    var ownedIds = alliance.areaIds.slice();
    var captureHistory = {};
    ownedIds.forEach(function (id) {
      captureHistory[id] = 1;
    });
    return {
      day: 1,
      alliance: alliance,
      ownedIds: ownedIds,
      cityCapturesToday: 0,
      bankCapturesToday: 0,
      actionsToday: 0,
      resources: sumAllianceResources({ areaIds: ownedIds }),
      counts: computeAllianceCounts({ areaIds: ownedIds }),
      keepIds: {},
      desiredRouteIds: [],
      ownedClasses: {},
      captureHistory: captureHistory,
      releasedHistory: {},
      recentReleasedIds: {},
      slotsUsedToday: {},
      preferredSideByDay: {}
    };
  }

  function refreshAllianceDayState(state) {
    state.resources = sumAllianceResources({ areaIds: state.ownedIds });
    state.counts = computeAllianceCounts({ areaIds: state.ownedIds });
    state.ownedClasses = classifyOwnedTerritories(state, state.desiredRouteIds || [], state.alliance || { areaIds: state.ownedIds });
    return state;
  }

  function nextAllianceDay(state) {
    state.day += 1;
    state.cityCapturesToday = 0;
    state.bankCapturesToday = 0;
    state.actionsToday = 0;
    state.slotsUsedToday = {};
    return refreshAllianceDayState(state);
  }

  function nextBattleSlotIndex(state) {
    var nextIndex = (state.actionsToday || 0) + 1;
    return Math.min(SEASON_CONFIG.battle.slotsPerDay, nextIndex);
  }

  function battleSlotLabel(slotIndex) {
    return "S" + String(slotIndex || 1);
  }

  function snapshotAllianceDayState(state, daySteps) {
    var slotKeys = Object.keys(state.slotsUsedToday || {}).map(Number).sort(function (a, b) { return a - b; });
    return {
      day: state.day,
      actions: daySteps.slice(),
      slotsUsed: slotKeys,
      ownedIds: state.ownedIds.slice(),
      citiesOwned: state.counts.cities.current,
      cityCapacity: state.counts.cities.max,
      banksOwned: state.counts.strongholds.current,
      bankCapacity: state.counts.strongholds.max,
      coin: state.resources.coin,
      influence: state.resources.influence,
      ownedClasses: Object.assign({}, state.ownedClasses),
      safeTimeHours: state.alliance && state.alliance.safeTimeHours ? state.alliance.safeTimeHours : SEASON_CONFIG.battle.safeTimeHours,
      safeTimeSlot: state.alliance && state.alliance.safeTimeSlot ? state.alliance.safeTimeSlot : 2
    };
  }

  function attachStateTimeline(schedule, alliance) {
    var state = createAllianceDayState(alliance);
    var timeline = [];
    var currentDay = null;
    var daySteps = [];

    function finalizeDay() {
      if (currentDay === null) return;
      refreshAllianceDayState(state);
      timeline.push(snapshotAllianceDayState(state, daySteps));
    }

    schedule.forEach(function (step) {
      var point = pointById(step.areaId);
      if (!point) return;

      if (currentDay === null) currentDay = step.day;
      while (state.day < step.day) {
        finalizeDay();
        nextAllianceDay(state);
        currentDay = state.day;
        daySteps = [];
      }

      if (step.action === "release") {
        state.ownedIds = state.ownedIds.filter(function (id) { return id !== step.areaId; });
      } else if (state.ownedIds.indexOf(step.areaId) === -1) {
        state.ownedIds.push(step.areaId);
        if (point.territoryKind === "bank") state.bankCapturesToday += 1;
        if (point.territoryKind === "city") state.cityCapturesToday += 1;
      }

      daySteps.push({
        areaId: step.areaId,
        action: step.action,
        territoryKind: step.territoryKind,
        routeRole: step.routeRole,
        note: step.note || "",
        slotIndex: step.slotIndex,
        slotLabel: step.slotLabel
      });
      refreshAllianceDayState(state);
      step.stateAfter = {
        citiesOwned: state.counts.cities.current,
        cityCapacity: state.counts.cities.max,
        banksOwned: state.counts.strongholds.current,
        bankCapacity: state.counts.strongholds.max,
        coin: state.resources.coin,
        influence: state.resources.influence
      };
    });

    finalizeDay();
    return timeline;
  }

  function frontierCandidateIds(ownedIds, alliance) {
    var ownedMap = {};
    ownedIds.forEach(function (id) { ownedMap[id] = true; });
    return uniquePathIds(
      ownedIds
        .map(pointById)
        .filter(Boolean)
        .reduce(function (acc, ownedPoint) {
          return acc.concat(
            allPoints
              .filter(isTraversalPoint)
              .filter(function (candidate) {
                return !ownedMap[candidate.id] &&
                  pointsAdjacent(ownedPoint, candidate) &&
                  territoryOccupancyForAlliance(candidate.id, alliance) !== "blocked";
              })
              .map(function (candidate) { return candidate.id; })
          );
        }, [])
    );
  }

  function nextDesiredRouteId(desiredRouteIds, ownedIds) {
    var ownedMap = {};
    ownedIds.forEach(function (id) { ownedMap[id] = true; });
    return desiredRouteIds.find(function (id) { return !ownedMap[id]; }) || null;
  }

  function strategicCandidateScore(point, state, desiredRouteIds, style, palace) {
    var desiredSet = {};
    desiredRouteIds.forEach(function (id, index) {
      desiredSet[id] = index + 1;
    });
    var nextDesiredId = nextDesiredRouteId(desiredRouteIds, state.ownedIds);
    var desiredIndex = desiredSet[point.id] || 0;
    var score = pointResourceScore(point) / 10000;
    var sameNameToday = (state.capturedNamesToday[pointName(point)] || 0);
    var pointSideName = palace ? pointSide(point, palace) : null;
    var preferredSide = state.preferredSideByDay ? state.preferredSideByDay[state.day] : null;

    if (desiredSet[point.id]) score += Math.max(40, 220 - desiredSet[point.id] * 8);
    if (nextDesiredId === point.id) score += 500;
    if (point.territoryKind === "bank") score += 40 + point.level * 18;
    if (point.territoryKind === "city") score += 60 + cityOpportunityScore(point) / 10000;
    if (point.territoryKind === "sanctuary") score += 900;
    score += Math.max(0, 80 - distanceToPalaceZone(point) / 40);
    if (preferredSide && pointSideName === preferredSide) score += 65;
    if (preferredSide && pointSideName && pointSideName !== preferredSide && !desiredSet[point.id]) score -= 45;

    if (style === "direct") {
      if (point.territoryKind === "bank") score += 90;
      if (point.id === nextDesiredId) score += 220;
      if (point.territoryKind === "city") score -= 25;
    } else if (style === "safe") {
      if (point.territoryKind === "city") score += 80;
      if (point.level >= 4) score += 40;
    } else if (style === "cannon-heavy") {
      if (point.territoryKind === "city") score += 55;
      if (point.level >= 6) score += 70;
    }

    if (state.alliance && (state.alliance.priorityRank || 99) <= 3) {
      if (desiredIndex && desiredIndex <= 8) score += 260;
      if (desiredIndex && desiredIndex <= 16) score += 120;
      if (point.id === nextDesiredId) score += 480;
      if (!desiredSet[point.id] && point.territoryKind === "city") score -= 260;
      if (!desiredSet[point.id] && point.territoryKind === "bank") score -= 90;
      if (!desiredSet[point.id] && point.territoryKind === "bank" && point.level <= 4) score -= 80;
      if (!desiredSet[point.id] && distanceToPalaceZone(point) > 1200) score -= 120;
    }

    if (pointName(point) === "Lawless Road") score -= 80;
    if (sameNameToday) score -= sameNameToday * 140;
    if (state.captureHistory && state.captureHistory[point.id]) {
      score -= state.captureHistory[point.id] * 220;
      if (nextDesiredId !== point.id) score -= 320;
    }
    if (state.releasedHistory && state.releasedHistory[point.id]) {
      score -= state.releasedHistory[point.id] * 380;
    }
    if (state.recentReleasedIds && state.recentReleasedIds[point.id] === state.day) {
      score -= 1200;
    }
    return score;
  }

  function buildStrategicSchedule(desiredRouteIds, alliance, style) {
    var palace = pointById("poi:I61");
    var state = createAllianceDayState(alliance);
    state.desiredRouteIds = desiredRouteIds.slice();
    var schedule = [];
    var desiredRouteMap = {};
    desiredRouteIds.forEach(function (id) {
      desiredRouteMap[id] = true;
    });
    var stagnationDays = 0;
    var maxDays = 14;

    function stepRoleFor(point, action) {
      if (action === "release") return "release";
      if (!point) return "unknown";
      if (desiredRouteMap[point.id]) return "main-trunk";
      if (point.territoryKind === "city") return "war-day-side";
      return "support-side";
    }

    function preferredRolesForSlot(slotIndex) {
      if ((alliance.priorityRank || 99) <= 3) {
        if (isWarDay(state.day) && slotIndex === 3) return ["main-trunk", "war-day-side", "support-side"];
        return ["main-trunk", "support-side", "war-day-side"];
      }
      if (isWarDay(state.day)) {
        if (slotIndex === 3) return ["war-day-side", "main-trunk", "support-side"];
        return ["main-trunk", "war-day-side", "support-side"];
      }
      return ["main-trunk", "support-side", "war-day-side"];
    }

    function chooseCandidateForSlot(candidates) {
      var slotIndex = nextBattleSlotIndex(state);
      var preferredRoles = preferredRolesForSlot(slotIndex);
      var roleBuckets = {};
      preferredRoles.forEach(function (role) {
        roleBuckets[role] = [];
      });

      candidates.forEach(function (candidate) {
        var role = stepRoleFor(candidate, "capture");
        if (!roleBuckets[role]) roleBuckets[role] = [];
        roleBuckets[role].push(candidate);
      });

      for (var index = 0; index < preferredRoles.length; index += 1) {
        var roleCandidates = roleBuckets[preferredRoles[index]] || [];
        if (roleCandidates.length) return roleCandidates[0];
      }
      return candidates[0] || null;
    }

    function addStep(areaId, action, note) {
      var point = pointById(areaId);
      if (!point) return;
      var slotIndex = nextBattleSlotIndex(state);
      var role = stepRoleFor(point, action);
      schedule.push({
        day: state.day,
        areaId: areaId,
        territoryKind: point.territoryKind,
        action: action,
        slotIndex: slotIndex,
        slotLabel: battleSlotLabel(slotIndex),
        routeRole: role,
        note: note || ""
      });
      state.actionsToday += 1;
      state.slotsUsedToday[slotIndex] = true;
      if (action !== "release" && role !== "main-trunk") {
        state.preferredSideByDay[state.day] = pointSide(point, palace);
      }
    }

    function releaseFor(point) {
      refreshAllianceDayState(state);
      if (point.territoryKind === "bank") {
        while (state.counts.strongholds.current >= state.counts.strongholds.max) {
          var bankToRelease = state.ownedIds
            .map(pointById)
            .filter(Boolean)
            .filter(function (ownedPoint) {
              return ownedPoint.territoryKind === "bank" && state.ownedClasses[ownedPoint.id] === "release-candidate";
            })
            .sort(function (a, b) {
              return pointResourceScore(a) - pointResourceScore(b) || a.level - b.level;
            })[0] || releaseCandidate(state.ownedIds, desiredRouteIds, alliance, "bank");
          if (!bankToRelease) return false;
          addStep(bankToRelease.id, "release", "Release bank slot before capturing " + pointName(point));
          state.ownedIds = state.ownedIds.filter(function (id) { return id !== bankToRelease.id; });
          state.releasedHistory[bankToRelease.id] = (state.releasedHistory[bankToRelease.id] || 0) + 1;
          state.recentReleasedIds[bankToRelease.id] = state.day;
          refreshAllianceDayState(state);
        }
        return true;
      }
      if (point.territoryKind === "city") {
        while (state.counts.cities.current >= state.counts.cities.max) {
          var cityToRelease = state.ownedIds
            .map(pointById)
            .filter(Boolean)
            .filter(function (ownedPoint) {
              return ownedPoint.territoryKind === "city" && state.ownedClasses[ownedPoint.id] === "release-candidate";
            })
            .sort(function (a, b) {
              return pointResourceScore(a) - pointResourceScore(b) || a.level - b.level;
            })[0] || releaseCandidate(state.ownedIds, desiredRouteIds, alliance, "city");
          if (!cityToRelease) return false;
          addStep(cityToRelease.id, "release", "Release city slot before capturing " + pointName(point));
          state.ownedIds = state.ownedIds.filter(function (id) { return id !== cityToRelease.id; });
          state.releasedHistory[cityToRelease.id] = (state.releasedHistory[cityToRelease.id] || 0) + 1;
          state.recentReleasedIds[cityToRelease.id] = state.day;
          refreshAllianceDayState(state);
        }
        while (state.counts.strongholds.current > state.counts.strongholds.max) {
          var forcedBankRelease = state.ownedIds
            .map(pointById)
            .filter(Boolean)
            .filter(function (ownedPoint) {
              return ownedPoint.territoryKind === "bank" && state.ownedClasses[ownedPoint.id] === "release-candidate";
            })
            .sort(function (a, b) {
              return pointResourceScore(a) - pointResourceScore(b) || a.level - b.level;
            })[0] || releaseCandidate(state.ownedIds, desiredRouteIds, alliance, "bank");
          if (!forcedBankRelease) return false;
          addStep(forcedBankRelease.id, "release", "Release bank after city capture to stay within stronghold capacity");
          state.ownedIds = state.ownedIds.filter(function (id) { return id !== forcedBankRelease.id; });
          state.releasedHistory[forcedBankRelease.id] = (state.releasedHistory[forcedBankRelease.id] || 0) + 1;
          state.recentReleasedIds[forcedBankRelease.id] = state.day;
          refreshAllianceDayState(state);
        }
        return true;
      }
      return true;
    }

    while (state.day <= maxDays) {
      var capturedToday = 0;
      var actionBudget = isWarDay(state.day) ? 3 : 2;
      var maxSideCapturesToday = (alliance.priorityRank || 99) <= 3 ? (isWarDay(state.day) ? 1 : 0) : actionBudget;
      var sideCapturesToday = 0;
      state.capturedNamesToday = {};

      while (capturedToday < actionBudget) {
        var slotIndex = nextBattleSlotIndex(state);
        var frontierIds = frontierCandidateIds(state.ownedIds, alliance);
        var candidates = frontierIds
          .map(pointById)
          .filter(Boolean)
          .filter(function (point) {
            var role = stepRoleFor(point, "capture");
            if ((alliance.priorityRank || 99) <= 3 && role !== "main-trunk" && sideCapturesToday >= maxSideCapturesToday) return false;
            if ((alliance.priorityRank || 99) <= 3 && slotIndex <= 2 && role !== "main-trunk") return false;
            if (point.territoryKind === "sanctuary") return isWarDay(state.day);
            if (point.territoryKind === "city") return isWarDay(state.day) && state.cityCapturesToday < 3;
            if (point.territoryKind === "bank") return state.bankCapturesToday < 2;
            return false;
          })
          .sort(function (a, b) {
            return strategicCandidateScore(b, state, desiredRouteIds, style, palace) -
              strategicCandidateScore(a, state, desiredRouteIds, style, palace);
          });

        if (!candidates.length) break;

        var strictTrunkCandidates = (alliance.priorityRank || 99) <= 3
          ? candidates.filter(function (point) { return stepRoleFor(point, "capture") === "main-trunk"; })
          : candidates;
        var candidate = chooseCandidateForSlot(strictTrunkCandidates.length ? strictTrunkCandidates : candidates);
        if (!candidate) break;
        if (!releaseFor(candidate)) break;

        var occupancy = territoryOccupancyForAlliance(candidate.id, alliance);
        var captureNote = occupancy === "transferable"
          ? "Cooperative handoff from lower-priority alliance in the same warzone."
          : "";
        addStep(candidate.id, "capture", captureNote);
        state.ownedIds.push(candidate.id);
        state.captureHistory[candidate.id] = (state.captureHistory[candidate.id] || 0) + 1;
        if (stepRoleFor(candidate, "capture") !== "main-trunk") sideCapturesToday += 1;
        if (candidate.territoryKind === "bank") state.bankCapturesToday += 1;
        if (candidate.territoryKind === "city") state.cityCapturesToday += 1;
        state.capturedNamesToday[pointName(candidate)] = (state.capturedNamesToday[pointName(candidate)] || 0) + 1;
        refreshAllianceDayState(state);
        capturedToday += 1;

        if (candidate.territoryKind === "sanctuary") {
          schedule.timeline = attachStateTimeline(schedule, alliance);
          return schedule;
        }
      }

      if (!capturedToday) {
        stagnationDays += 1;
      } else {
        stagnationDays = 0;
      }
      if (stagnationDays >= 2) break;
      nextAllianceDay(state);
    }

    schedule.timeline = attachStateTimeline(schedule, alliance);
    return schedule;
  }

  function buildConquestSchedule(routeIds, alliance) {
    var owned = {};
    var ownedIds = alliance.areaIds.slice();
    ownedIds.forEach(function (id) {
      owned[id] = true;
    });

    var day = 1;
    var bankCount = 0;
    var cityCount = 0;
    var schedule = [];

    function nextDay() {
      day += 1;
      bankCount = 0;
      cityCount = 0;
    }

    function addStep(areaId, action, note) {
      var point = pointById(areaId);
      if (!point) return;
      schedule.push({
        day: day,
        areaId: areaId,
        territoryKind: point.territoryKind,
        action: action,
        note: note || ""
      });
    }

    function releaseArea(point, note) {
      if (!point || !owned[point.id]) return false;
      addStep(point.id, "release", note);
      delete owned[point.id];
      ownedIds = ownedIds.filter(function (id) { return id !== point.id; });
      return true;
    }

    function normalizeStrongholdCapacity(remainingRouteIds) {
      while (true) {
        var ownedPoints = ownedPointsFromIds(ownedIds);
        var bankOwned = ownedPoints.filter(function (item) { return item.territoryKind === "bank"; });
        var allowedBanks = strongholdCapacityForOwnedPoints(ownedPoints);
        if (bankOwned.length <= allowedBanks) break;
        var forcedRelease = releaseCandidate(ownedIds, remainingRouteIds, alliance, "bank") || bankOwned.sort(function (a, b) {
          return pointResourceScore(a) - pointResourceScore(b);
        })[0];
        if (!releaseArea(forcedRelease, "Release bank to stay within stronghold capacity")) break;
      }
    }

    routeIds.forEach(function (areaId) {
      if (owned[areaId]) return;
      var point = pointById(areaId);
      if (!point) return;
      if (point.territoryKind !== "bank" && point.territoryKind !== "city" && point.territoryKind !== "sanctuary") return;
      var remainingRouteIds = routeIds.slice(routeIds.indexOf(areaId) + 1);

      while (true) {
        if (point.territoryKind === "bank") {
          var ownedPoints = ownedPointsFromIds(ownedIds);
          var currentBanks = ownedPoints.filter(function (item) { return item.territoryKind === "bank"; }).length;
          var allowedBanks = strongholdCapacityForOwnedPoints(ownedPoints);
          if (currentBanks >= allowedBanks) {
            var bankToRelease = releaseCandidate(ownedIds, remainingRouteIds, alliance, "bank");
            if (!bankToRelease) {
              nextDay();
              continue;
            }
            releaseArea(bankToRelease, "Release bank slot before capturing " + pointName(point));
            continue;
          }
          if (bankCount < 2) break;
          nextDay();
          continue;
        }
        if (point.territoryKind === "city") {
          var currentCities = ownedPointsFromIds(ownedIds).filter(isCity).length;
          if (currentCities >= SEASON_CONFIG.limits.maxCities) {
            var cityToRelease = releaseCandidate(ownedIds, remainingRouteIds, alliance, "city");
            if (!cityToRelease) {
              nextDay();
              continue;
            }
            releaseArea(cityToRelease, "Release city slot before capturing " + pointName(point));
            normalizeStrongholdCapacity(remainingRouteIds);
            continue;
          }
          if (isWarDay(day) && cityCount < 3) break;
          nextDay();
          continue;
        }
        if (point.territoryKind === "sanctuary") {
          if (isWarDay(day)) break;
          nextDay();
          continue;
        }
      }

      addStep(areaId, "capture");

      if (point.territoryKind === "bank") bankCount += 1;
      if (point.territoryKind === "city") cityCount += 1;
      owned[areaId] = true;
      ownedIds.push(areaId);
      normalizeStrongholdCapacity(remainingRouteIds);
    });

    schedule.timeline = attachStateTimeline(schedule, alliance);
    return schedule;
  }

  function summarizeSchedule(schedule) {
    var days = {};
    schedule.forEach(function (step) {
      if (!days[step.day]) {
        days[step.day] = {
          banks: 0,
          cities: 0,
          palace: 0,
          releases: 0,
          citiesOwned: 0,
          cityCapacity: 0,
          banksOwned: 0,
          bankCapacity: 0,
          coin: 0,
          influence: 0,
          slotsUsed: {}
        };
      }
      if (step.action === "release") {
        days[step.day].releases += 1;
      } else {
        if (step.territoryKind === "bank") days[step.day].banks += 1;
        if (step.territoryKind === "city") days[step.day].cities += 1;
        if (step.territoryKind === "sanctuary") days[step.day].palace += 1;
      }
      if (step.stateAfter) {
        days[step.day].citiesOwned = step.stateAfter.citiesOwned;
        days[step.day].cityCapacity = step.stateAfter.cityCapacity;
        days[step.day].banksOwned = step.stateAfter.banksOwned;
        days[step.day].bankCapacity = step.stateAfter.bankCapacity;
        days[step.day].coin = step.stateAfter.coin;
        days[step.day].influence = step.stateAfter.influence;
      }
      if (step.slotIndex) days[step.day].slotsUsed[step.slotIndex] = true;
    });
    return days;
  }

  function planRoleMetrics(schedule) {
    var metrics = {
      mainTrunkCaptures: 0,
      sideCaptures: 0,
      releaseActions: 0,
      sideInterruptions: 0,
      mixedSlotDays: 0
    };
    var dayMix = {};
    var previousCaptureRole = null;

    schedule.forEach(function (step) {
      if (step.action === "release") {
        metrics.releaseActions += 1;
        return;
      }

      var role = step.routeRole === "main-trunk" ? "main-trunk" : "side";
      if (role === "main-trunk") {
        metrics.mainTrunkCaptures += 1;
      } else {
        metrics.sideCaptures += 1;
      }

      if (previousCaptureRole && previousCaptureRole !== role) {
        metrics.sideInterruptions += 1;
      }
      previousCaptureRole = role;

      if (!dayMix[step.day]) dayMix[step.day] = { trunk: 0, side: 0 };
      if (role === "main-trunk") dayMix[step.day].trunk += 1;
      else dayMix[step.day].side += 1;
    });

    Object.keys(dayMix).forEach(function (day) {
      if (dayMix[day].trunk && dayMix[day].side) metrics.mixedSlotDays += 1;
    });

    return metrics;
  }

  function computeSeasonMaintenance(schedule) {
    var SEASON_DAYS = 56;
    var BANK_EXPIRY = SEASON_CONFIG.territory.bankExpiryDays;
    var CITY_EXPIRY = SEASON_CONFIG.territory.cityExpiryDays;

    var firstCaptureDay = {};
    schedule.forEach(function (step) {
      if (step.action === "release" || firstCaptureDay[step.areaId]) return;
      var point = pointById(step.areaId);
      if (point && (point.territoryKind === "bank" || isCity(point))) {
        firstCaptureDay[step.areaId] = step.day;
      }
    });

    var bankRecaptures = 0;
    var cityRecaptures = 0;
    var recaptureInfluence = 0;
    var events = [];

    Object.keys(firstCaptureDay).forEach(function (id) {
      var point = pointById(id);
      if (!point) return;
      var captureDay = firstCaptureDay[id];
      var expiry = point.territoryKind === "bank" ? BANK_EXPIRY : CITY_EXPIRY;
      var pointInf = (point.resources && point.resources.influence) || 0;
      var day = captureDay + expiry;
      while (day <= SEASON_DAYS) {
        if (point.territoryKind === "bank") bankRecaptures += 1;
        else cityRecaptures += 1;
        recaptureInfluence += pointInf;
        events.push({ day: day, id: id, kind: point.territoryKind, name: pointName(point) });
        day += expiry;
      }
    });

    events.sort(function (a, b) { return a.day - b.day; });

    var fightDaysSet = {};
    events.forEach(function (e) { fightDaysSet[e.day] = true; });

    return {
      bankRecaptures: bankRecaptures,
      cityRecaptures: cityRecaptures,
      recaptureInfluence: recaptureInfluence,
      totalSeasonFightDays: Object.keys(fightDaysSet).length,
      events: events
    };
  }

  function estimatePlanScore(plan) {
    var alliance = currentAlliance();
    var isCoreAlliance = alliance && (alliance.priorityRank || 99) <= 3;
    var weights = {
      access: plan.hasAccess ? 1200 : 0,
      influence: plan.metrics.influence / 10000,
      crystal: plan.metrics.coin * 8,
      cities: plan.metrics.cities * 140,
      banks: plan.metrics.banks * 90,
      releases: -plan.metrics.releases * 45,
      totalDays: -plan.metrics.totalDays * 55,
      warDays: -plan.metrics.warDaysUsed * 25,
      inefficiency: -plan.metrics.inefficiency * 20,
      trunkDepth: plan.metrics.mainTrunkCaptures * (isCoreAlliance ? 80 : 28),
      sideCaptures: isCoreAlliance ? -plan.metrics.sideCaptures * 140 : 0,
      sideInterruptions: -plan.metrics.sideInterruptions * (isCoreAlliance ? 120 : 60),
      mixedSlotDays: -plan.metrics.mixedSlotDays * (isCoreAlliance ? 80 : 35)
    };
    plan.scoreBreakdown = weights;
    return Object.keys(weights).reduce(function (sum, key) {
      return sum + weights[key];
    }, 0);
  }

  function clearSimulationPreview(allianceId) {
    if (!allianceId || previewAllianceId === allianceId) {
      previewPlanIndex = -1;
      previewAllianceId = null;
    }
  }

  function currentPreviewPlan() {
    if (previewPlanIndex < 0 || !simulationPlans[previewPlanIndex]) return null;
    var alliance = currentAlliance();
    if (!alliance || previewAllianceId !== alliance.id) return null;
    return simulationPlans[previewPlanIndex];
  }

  function previewRouteForAlliance(allianceId) {
    var plan = currentPreviewPlan();
    if (!plan || !allianceId || previewAllianceId !== allianceId) return [];
    return plan.schedule.map(function (scheduledStep, index) {
      return {
        areaId: scheduledStep.areaId,
        allianceId: allianceId,
        step: index + 1,
        day: scheduledStep.day,
        slotIndex: scheduledStep.slotIndex,
        slotLabel: scheduledStep.slotLabel,
        routeRole: scheduledStep.routeRole,
        action: scheduledStep.action,
        note: scheduledStep.note
      };
    });
  }

  function applySimulationPlan(plan) {
    var grid = currentGrid();
    var alliance = currentAlliance();
    if (!grid || !alliance || !plan) return;

    previewPlanIndex = simulationPlans.indexOf(plan);
    previewAllianceId = alliance.id;

    updateGrid(grid.id, {
      pathSteps: grid.pathSteps
        .filter(function (step) { return step.allianceId !== alliance.id; })
        .concat(plan.schedule.map(function (scheduledStep, index) {
          return {
            areaId: scheduledStep.areaId,
            allianceId: alliance.id,
            step: index + 1,
            day: scheduledStep.day,
            slotIndex: scheduledStep.slotIndex,
            slotLabel: scheduledStep.slotLabel,
            routeRole: scheduledStep.routeRole,
            action: scheduledStep.action,
            note: scheduledStep.note
          };
        })),
      showStrongholds: true
    });

    setSimulationNote(
      "Applied " + plan.name + ". " + plan.summary
    );
  }

  function setAllianceStartArea() {
    var grid = currentGrid();
    var alliance = currentAlliance();
    var point = pointById(selectedPointId);

    if (!grid || !alliance || !point) {
      setSimulationNote("Select an alliance and a valid territory before setting the start area.");
      return;
    }
    if (!isAssignable(point)) {
      setSimulationNote("Only cities and bank strongholds can be used as alliance starting territory.");
      return;
    }

    updateGrid(grid.id, {
      alliances: grid.alliances.map(function (item) {
        if (item.id !== alliance.id) return item;
        var nextAreaIds = item.areaIds.filter(function (id) { return id !== point.id; });
        nextAreaIds.unshift(point.id);
        return Object.assign({}, item, { areaIds: uniquePathIds(nextAreaIds) });
      })
    });

    setSimulationNote("Starting territory set to " + pointName(point) + " Lv." + point.level + ".");
  }

  function renderSimulationPlans() {
    if (!solutionList) return;

    if (!simulationPlans.length) {
      solutionList.innerHTML = '<div class="route-empty">No simulated plans yet.</div>';
      return;
    }

    solutionList.innerHTML = "";
    simulationPlans.forEach(function (plan, index) {
      var node = document.createElement("div");
      node.className = "simulation-plan" + (index === previewPlanIndex ? " is-preview" : "");
      node.innerHTML =
        '<div class="simulation-plan-header">' +
          "<strong>" + plan.name + "</strong>" +
          '<div class="button-row">' +
            '<button class="secondary-button" type="button" data-action="preview-plan" data-plan-index="' + index + '">' + (index === previewPlanIndex ? "Previewing" : "Preview") + "</button>" +
            '<button class="secondary-button" type="button" data-action="apply-plan" data-plan-index="' + index + '">Apply</button>' +
          "</div>" +
        "</div>" +
        '<span class="palette-note">' + plan.summary + "</span>" +
        '<div class="simulation-plan-metrics">' +
          '<div class="simulation-metric">Score: ' + Math.round(plan.score) + "</div>" +
          '<div class="simulation-metric">Territories: ' + plan.metrics.steps + "</div>" +
          '<div class="simulation-metric">Total days: ' + plan.metrics.totalDays + "</div>" +
          '<div class="simulation-metric">War days used: ' + plan.metrics.warDaysUsed + "</div>" +
          '<div class="simulation-metric simulation-metric--season">Season influence (8 wks): ' + (plan.metrics.seasonInfluence || plan.metrics.influence) + "</div>" +
          '<div class="simulation-metric">Initial capture influence: ' + plan.metrics.influence + "</div>" +
          '<div class="simulation-metric">Coin/h: ' + plan.metrics.coin + "</div>" +
          '<div class="simulation-metric">Cities: ' + plan.metrics.cities + "</div>" +
          '<div class="simulation-metric">Banks: ' + plan.metrics.banks + "</div>" +
          '<div class="simulation-metric">Releases: ' + plan.metrics.releases + "</div>" +
          '<div class="simulation-metric">Main trunk: ' + plan.metrics.mainTrunkCaptures + "</div>" +
          '<div class="simulation-metric">Side captures: ' + plan.metrics.sideCaptures + "</div>" +
          '<div class="simulation-metric">Mixed slot days: ' + plan.metrics.mixedSlotDays + "</div>" +
          '<div class="simulation-metric">Peak day captures: ' + plan.metrics.peakDayCaptures + "</div>" +
          '<div class="simulation-metric">Final slots: ' + plan.metrics.finalCitiesOwned + "/" + plan.metrics.finalCityCapacity + " cities</div>" +
          '<div class="simulation-metric">Final banks: ' + plan.metrics.finalBanksOwned + "/" + plan.metrics.finalBankCapacity + "</div>" +
          '<div class="simulation-metric simulation-metric--expiry">Bank recaptures (8 wks): ' + (plan.metrics.bankRecaptures || 0) + "</div>" +
          '<div class="simulation-metric simulation-metric--expiry">City recaptures (8 wks): ' + (plan.metrics.cityRecaptures || 0) + "</div>" +
          '<div class="simulation-metric simulation-metric--expiry">Season fight days: ' + (plan.metrics.totalSeasonFightDays || 0) + "</div>" +
        "</div>";
      solutionList.appendChild(node);
    });
  }

  function simulateConquestPath() {
    var grid = currentGrid();
    var alliance = currentAlliance();
    var palace = allPoints.find(function (point) { return point.category === "capital"; });
    var rank = allianceRankSelect ? allianceRankSelect.value : "elite";

    if (!grid || !alliance || !palace) {
      setSimulationNote("Select an alliance before simulating the conquest route.");
      return;
    }

    var sectorId = Number(warzoneSectorSelect && warzoneSectorSelect.value ? warzoneSectorSelect.value : 6);
    var nexusPoint = allPoints.find(function (p) { return p.category === "nexus" && warzoneSectorForPoint(p) === sectorId; });

    var frontier = allianceFrontier(alliance);
    // If the alliance has no owned territories, override frontier with the closest lv1-2 city
    // in the selected war zone sector (not the global closest, which may be in another sector)
    if (!alliance.areaIds || !alliance.areaIds.length) {
      var sectorFrontier = warzoneStartPoints(sectorId)[0] || null;
      if (sectorFrontier) frontier = sectorFrontier;
    }

    var entries = centralBankStrongholds();
    if (!frontier || !entries.length) {
      setSimulationNote("No valid Season 6 graph data found for Sanctuary simulation.");
      return;
    }

    var entryCandidates = entries
      .map(function (entry) {
        return {
          entry: entry,
          path: shortestPath(frontier.id, entry.id, allPoints)
        };
      })
      .filter(function (candidate) { return candidate.path.length; })
      .sort(function (a, b) { return a.path.length - b.path.length; })
      .slice(0, rank === "elite" ? 5 : 3);

    if (!entryCandidates.length) {
      setSimulationNote("No traversable path from the current alliance frontier to a lv 10 Bank Stronghold.");
      return;
    }

    var rankedPlans = entryCandidates.reduce(function (plans, candidate) {
      var profilePlans = simulationProfiles(rank)
        .filter(function (profile) { return profile.key !== "outpost-control"; })
        .map(function (profile) {
        var baseRouteIds;
        if (profile.key === "via-nexus" && nexusPoint) {
          var legToNexus = shortestPath(frontier.id, nexusPoint.id, allPoints);
          var legToEntry = shortestPath(nexusPoint.id, candidate.entry.id, allPoints);
          if (legToNexus.length && legToEntry.length) {
            baseRouteIds = uniquePathIds(legToNexus.concat(legToEntry.slice(1)).concat([palace.id]));
          } else {
            baseRouteIds = uniquePathIds(candidate.path.concat([palace.id]));
          }
        } else {
          baseRouteIds = uniquePathIds(candidate.path.concat([palace.id]));
        }
        var desiredRouteIds = buildRouteVariant(baseRouteIds, profile.key === "via-nexus" ? "safe" : profile.key);
        var schedule = buildStrategicSchedule(desiredRouteIds, alliance, profile.key);
        var routeIds = schedule
          .filter(function (step) { return step.action !== "release"; })
          .map(function (step) { return step.areaId; });
        var routePoints = routeIds.map(pointById).filter(Boolean);
        var hasAccess = routePoints.some(function (point) {
          return point.level >= 10 &&
            (point.territoryKind === "bank" || isCity(point)) &&
            adjacentToPalaceZone(point);
        });
        var scheduledIds = schedule
          .filter(function (step) { return step.action !== "release"; })
          .map(function (step) { return step.areaId; });
        var resourceTotals = resourceTotalsForPath(scheduledIds);
        var categoryCounts = routeCategoryCounts(scheduledIds);
        var daily = summarizeSchedule(schedule);
        var roleMetrics = planRoleMetrics(schedule);
        var dayKeys = Object.keys(daily).map(function (key) { return Number(key); });
        var peakDayCaptures = dayKeys.length ? Math.max.apply(null, dayKeys.map(function (day) {
          return daily[day].banks + daily[day].cities + daily[day].palace;
        })) : 0;
        var warDaysUsed = dayKeys.filter(isWarDay).length;
        var totalReleases = schedule.filter(function (step) { return step.action === "release"; }).length;
        var finalDay = dayKeys.length ? daily[dayKeys[dayKeys.length - 1]] : null;

        var plan = {
          id: "plan-" + candidate.entry.id + "-" + profile.key,
          name: profile.label + " · " + pointName(candidate.entry) + " Lv." + candidate.entry.level,
          styleKey: profile.key,
          entryPointId: candidate.entry.id,
          routeIds: routeIds,
          hasAccess: hasAccess,
          schedule: schedule,
          metrics: {
            steps: routeIds.length,
            totalDays: dayKeys.length ? dayKeys[dayKeys.length - 1] : 0,
            warDaysUsed: warDaysUsed,
            peakDayCaptures: peakDayCaptures,
            inefficiency: Math.max(0, routeIds.length - candidate.path.length),
            coin: resourceTotals.coin,
            influence: resourceTotals.influence,
            cities: categoryCounts.cities,
            banks: categoryCounts.banks,
            releases: totalReleases,
            mainTrunkCaptures: roleMetrics.mainTrunkCaptures,
            sideCaptures: roleMetrics.sideCaptures,
            sideInterruptions: roleMetrics.sideInterruptions,
            mixedSlotDays: roleMetrics.mixedSlotDays,
            finalCitiesOwned: finalDay ? finalDay.citiesOwned : computeAllianceCounts(alliance).cities.current,
            finalCityCapacity: finalDay ? finalDay.cityCapacity : computeAllianceCounts(alliance).cities.max,
            finalBanksOwned: finalDay ? finalDay.banksOwned : computeAllianceCounts(alliance).strongholds.current,
            finalBankCapacity: finalDay ? finalDay.bankCapacity : computeAllianceCounts(alliance).strongholds.max
          }
        };

        var maintenance = computeSeasonMaintenance(schedule);
        plan.metrics.bankRecaptures = maintenance.bankRecaptures;
        plan.metrics.cityRecaptures = maintenance.cityRecaptures;
        plan.metrics.totalSeasonFightDays = maintenance.totalSeasonFightDays;
        // Season-total influence: initial captures + recaptures over 56 days
        // Sanctuary and outpost have 3 battle windows (Weeks 5-7); count additional 2 captures if on route
        var gpPoint = allPoints.filter(function (p) { return p.category === "palace"; })[0];
        var gpOnRoute = gpPoint && routeIds.indexOf(gpPoint.id) !== -1;
        var gpSeasonBonus = gpOnRoute ? (gpPoint.resources && gpPoint.resources.influence || 1800000) * 2 : 0;
        var outpostOnRoute = allPoints.some(function (p) {
          return p.category === "outpost" && routeIds.indexOf(p.id) !== -1;
        });
        var outpostSeasonBonus = outpostOnRoute ? 100000 * 2 : 0;
        plan.metrics.seasonInfluence = resourceTotals.influence + maintenance.recaptureInfluence + gpSeasonBonus + outpostSeasonBonus;

        var routeIncludesNexus = nexusPoint && routeIds.indexOf(nexusPoint.id) !== -1;
        plan.summary =
          profile.label + " via " + (routeIncludesNexus ? "Assembly → " : "") + pointName(candidate.entry) + " Lv." + candidate.entry.level +
          " · " + categoryCounts.banks + " banks and " + categoryCounts.cities + " cities on the route" +
          " · " + totalReleases + " releases" +
          " · " + plan.metrics.totalDays + " day conquest" +
          " · ~" + maintenance.totalSeasonFightDays + " maintenance fight days over 8 weeks";
        plan.score = estimatePlanScore(plan);
        return plan;
      });
      return plans.concat(profilePlans);
    }, []);

    // Outpost conquest plans (target: bank adjacent to nearest war zone outpost)
    var outpostSector = preferredWarzoneSector();
    var outpostEntryList = outpostAdjacentEntries(outpostSector);
    var outpostCandidates = outpostEntryList
      .slice(0, rank === "elite" ? 4 : 2)
      .map(function (item) {
        return {
          entry: item.entry,
          targetOutpost: item.targetOutpost,
          path: shortestPath(frontier.id, item.entry.id, allPoints)
        };
      })
      .filter(function (c) { return c.path.length; });

    outpostCandidates.forEach(function (candidate) {
      var desiredRouteIds = uniquePathIds(candidate.path);
      var schedule = buildStrategicSchedule(desiredRouteIds, alliance, "outpost-control");
      var routeIds = schedule
        .filter(function (step) { return step.action !== "release"; })
        .map(function (step) { return step.areaId; });
      var scheduledIds = schedule
        .filter(function (step) { return step.action !== "release"; })
        .map(function (step) { return step.areaId; });
      var resourceTotals = resourceTotalsForPath(scheduledIds);
      var outpostBonus = candidate.targetOutpost && candidate.targetOutpost.resources
        ? (candidate.targetOutpost.resources.influence || 0) : 100000;
      var categoryCounts = routeCategoryCounts(scheduledIds);
      var daily = summarizeSchedule(schedule);
      var roleMetrics = planRoleMetrics(schedule);
      var dayKeys = Object.keys(daily).map(function (key) { return Number(key); });
      var peakDayCaptures = dayKeys.length ? Math.max.apply(null, dayKeys.map(function (day) {
        return daily[day].banks + daily[day].cities;
      })) : 0;
      var warDaysUsed = dayKeys.filter(isWarDay).length;
      var totalReleases = schedule.filter(function (step) { return step.action === "release"; }).length;
      var finalDay = dayKeys.length ? daily[dayKeys[dayKeys.length - 1]] : null;
      var outpostLabel = candidate.targetOutpost ? candidate.targetOutpost.label : "Warzone Outpost";

      var plan = {
        id: "outpost-plan-" + candidate.entry.id,
        name: "Outpost Raid · " + pointName(candidate.entry) + " Lv." + candidate.entry.level,
        styleKey: "outpost-control",
        entryPointId: candidate.entry.id,
        targetOutpostId: candidate.targetOutpost ? candidate.targetOutpost.id : null,
        routeIds: routeIds,
        hasAccess: false,
        schedule: schedule,
        metrics: {
          steps: routeIds.length,
          totalDays: dayKeys.length ? dayKeys[dayKeys.length - 1] : 0,
          warDaysUsed: warDaysUsed,
          peakDayCaptures: peakDayCaptures,
          inefficiency: Math.max(0, routeIds.length - candidate.path.length),
          coin: resourceTotals.coin,
          influence: resourceTotals.influence + outpostBonus,
          cities: categoryCounts.cities,
          banks: categoryCounts.banks,
          releases: totalReleases,
          mainTrunkCaptures: roleMetrics.mainTrunkCaptures,
          sideCaptures: roleMetrics.sideCaptures,
          sideInterruptions: roleMetrics.sideInterruptions,
          mixedSlotDays: roleMetrics.mixedSlotDays,
          finalCitiesOwned: finalDay ? finalDay.citiesOwned : computeAllianceCounts(alliance).cities.current,
          finalCityCapacity: finalDay ? finalDay.cityCapacity : computeAllianceCounts(alliance).cities.max,
          finalBanksOwned: finalDay ? finalDay.banksOwned : computeAllianceCounts(alliance).strongholds.current,
          finalBankCapacity: finalDay ? finalDay.bankCapacity : computeAllianceCounts(alliance).strongholds.max
        }
      };
      var outpostMaintenance = computeSeasonMaintenance(schedule);
      plan.metrics.bankRecaptures = outpostMaintenance.bankRecaptures;
      plan.metrics.cityRecaptures = outpostMaintenance.cityRecaptures;
      plan.metrics.totalSeasonFightDays = outpostMaintenance.totalSeasonFightDays;
      // Outpost: 3 attack windows, count all 3 captures (first is in influence already via outpostBonus base)
      plan.metrics.seasonInfluence = resourceTotals.influence + outpostMaintenance.recaptureInfluence + outpostBonus * 3;
      plan.summary = "Outpost Raid via " + pointName(candidate.entry) + " Lv." + candidate.entry.level +
        " → " + outpostLabel + " (+100k influence on Fri/Week5-7)" +
        " · " + categoryCounts.banks + " banks and " + categoryCounts.cities + " cities on the route" +
        " · " + totalReleases + " releases" +
        " · " + plan.metrics.totalDays + " day reach" +
        " · ~" + outpostMaintenance.totalSeasonFightDays + " maintenance fight days over 8 weeks";
      plan.score = estimatePlanScore(plan);
      rankedPlans.push(plan);
    });

    rankedPlans.sort(function (a, b) { return b.score - a.score; });

    var picked = [];
    var pickedStyles = {};
    rankedPlans.forEach(function (plan) {
      if (picked.length >= 5) return;
      if (pickedStyles[plan.styleKey]) return;
      picked.push(plan);
      pickedStyles[plan.styleKey] = true;
    });
    rankedPlans.forEach(function (plan) {
      if (picked.length >= 5) return;
      if (picked.some(function (item) { return item.id === plan.id; })) return;
      picked.push(plan);
    });
    simulationPlans = picked.slice(0, 5);

    previewPlanIndex = simulationPlans.length ? 0 : -1;
    previewAllianceId = alliance.id;
    renderSimulationPlans();
    render();

    var accessReady = allianceHasGoldenPalaceAccess(alliance);
    setSimulationNote(
      (accessReady ? "Alliance already has a valid Sanctuary attack condition. " : "Alliance does not yet own a valid Sanctuary attack tile; compare the generated schedules before applying one. ") +
      (simulationPlans.length ? "The best plan is now previewed on the map. " : "") +
      "Generated " + simulationPlans.length + " ranked day-by-day conquest plans for profile " + rank + "."
    );
  }

  function triggerGridImport() {
    if (gridImportFile) gridImportFile.click();
  }

  function exportGrids() {
    if (!grids.length) return;

    var payload = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      season: SEASON,
      grids: grids
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "season-" + SEASON + "-grids-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function normalizeImportedGrid(grid, index) {
    if (!grid || typeof grid !== "object") return null;
    if (typeof grid.name !== "string" || !Array.isArray(grid.alliances) || !Array.isArray(grid.pathSteps)) {
      return null;
    }

    return {
      id: "s5-" + slug() + "-" + index,
      name: grid.name.indexOf("Season " + SEASON) === 0 ? grid.name : "Season " + SEASON + " - " + grid.name,
      alliances: Array.isArray(grid.alliances) ? grid.alliances.map(normalizeAlliance) : [],
      pathSteps: Array.isArray(grid.pathSteps) ? grid.pathSteps : [],
      showStrongholds: !!grid.showStrongholds,
      showCities: grid.showCities !== false,
      showBuffs: !!grid.showBuffs,
      proposedPathMode: !!grid.proposedPathMode,
      selectedAllianceId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function importGridsFromText(text) {
    var parsed = JSON.parse(text);
    var incoming = [];

    if (Array.isArray(parsed)) {
      incoming = parsed;
    } else if (parsed && Array.isArray(parsed.grids)) {
      incoming = parsed.grids;
    } else if (parsed && parsed.name && Array.isArray(parsed.alliances) && Array.isArray(parsed.pathSteps)) {
      incoming = [parsed];
    } else {
      throw new Error("Formato JSON non valido");
    }

    var normalized = incoming.map(normalizeImportedGrid).filter(Boolean);
    if (!normalized.length) throw new Error("Nessuna grid valida nel file");

    grids = grids.concat(normalized);
    currentGridId = normalized[0].id;
    persistGridState();
  }

  function updateSelectionPanel() {
    var point = pointById(selectedPointId);
    if (!point) {
      selectionPanel.innerHTML = "<strong>No area selected</strong><span class=\"palette-note\">Click a tile to inspect it or assign it to the selected alliance.</span>";
      return;
    }
    selectionPanel.innerHTML = pointSummary(point);
  }

  function routeForAlliance(allianceId) {
    var grid = currentGrid();
    if (!grid) return [];
    return grid.pathSteps
      .filter(function (step) { return step.allianceId === allianceId; })
      .sort(function (a, b) { return a.step - b.step; });
  }

  function activeRouteForAlliance(allianceId) {
    var previewRoute = previewRouteForAlliance(allianceId);
    if (previewRoute.length) return previewRoute;
    return routeForAlliance(allianceId);
  }

  function routeStepForPoint(allianceId, pointId) {
    return activeRouteForAlliance(allianceId).find(function (step) {
      return step.areaId === pointId;
    }) || null;
  }

  function dayColor(day) {
    var palette = [
      "#8BC1F7",
      "#4CB140",
      "#F4C145",
      "#EC7A08",
      "#FA83FC",
      "#64b5f6",
      "#ff8a65"
    ];
    return palette[Math.max(0, (day || 1) - 1) % palette.length];
  }

  function stepStrokeColor(step) {
    if (!step) return "rgba(10,20,10,0.7)";
    if (step.action === "release") return "#ff6b6b";
    return dayColor(step.day);
  }

  function routeRoleClassName(step) {
    if (!step || !step.routeRole) return "";
    return " role-" + step.routeRole;
  }

  function routeRoleLabel(step) {
    if (!step || !step.routeRole) return "";
    if (step.routeRole === "main-trunk") return "Main trunk";
    if (step.routeRole === "war-day-side") return "War side";
    if (step.routeRole === "support-side") return "Support";
    if (step.routeRole === "release") return "Release";
    return step.routeRole;
  }

  function updateRoutePanel() {
    var alliance = currentAlliance();
    if (!alliance) {
      routePanel.innerHTML = '<div class="route-empty">Select an alliance to inspect its conquest path.</div>';
      return;
    }

    var route = activeRouteForAlliance(alliance.id);
    if (!route.length) {
      routePanel.innerHTML = '<div class="route-empty">No path steps yet for ' + alliance.name + ".</div>";
      return;
    }

    routePanel.innerHTML = "";
    route.forEach(function (step) {
      var point = pointById(step.areaId);
      if (!point) return;
      var node = document.createElement("div");
      node.className = "route-step" + routeRoleClassName(step);
      var dayText = step.day ? ("Day " + step.day) : "";
      var slotText = step.slotLabel ? (" · " + step.slotLabel) : "";
      var previewTag = currentPreviewPlan() ? " · Preview" : "";
      var actionText = step.action === "release" ? "Release" : "Capture";
      node.innerHTML =
        "<strong>Step " + step.step + " · " + actionText + (dayText ? " · " + dayText : "") + slotText + previewTag + "</strong>" +
        "<span>" + pointName(point) + " Lv." + point.level + "</span>" +
        (step.routeRole ? "<span class=\"palette-note\">" + routeRoleLabel(step) + "</span>" : "") +
        "<span class=\"palette-note\">" + (point.territoryKind || point.category) + " · " + point.gridX + ", " + point.gridY + "</span>" +
        (step.day ? "<span class=\"palette-note\">" + (step.action === "release" ? "Release" : "Conquer") + " on day " + step.day + (step.slotLabel ? " in " + step.slotLabel : "") + "</span>" : "") +
        (step.stateAfter ? "<span class=\"palette-note\">After step: cities " + step.stateAfter.citiesOwned + "/" + step.stateAfter.cityCapacity + " · banks " + step.stateAfter.banksOwned + "/" + step.stateAfter.bankCapacity + "</span>" : "") +
        (step.stateAfter ? "<span class=\"palette-note\">Yield after step: " + step.stateAfter.coin + " Coin/h · " + step.stateAfter.influence + " Influence</span>" : "") +
        (step.note ? "<span class=\"palette-note\">" + step.note + "</span>" : "");
      routePanel.appendChild(node);
    });
  }

  function updateTimelinePanel() {
    var alliance = currentAlliance();
    var plan = currentPreviewPlan();
    var route = alliance ? activeRouteForAlliance(alliance.id) : [];

    if (!timelinePanel) return;
    if (!alliance || !plan || !plan.schedule || !plan.schedule.timeline || !plan.schedule.timeline.length) {
      timelinePanel.innerHTML = '<div class="route-empty">No day-by-day plan yet.</div>';
      return;
    }

    timelinePanel.innerHTML = "";
    plan.schedule.timeline.forEach(function (dayState) {
      var node = document.createElement("div");
      node.className = "timeline-day";
      var actionsText = dayState.actions.map(function (action) {
        var point = pointById(action.areaId);
        var roleText = action.routeRole ? " [" + routeRoleLabel(action) + "]" : "";
        return (action.slotLabel ? action.slotLabel + " " : "") + (action.action === "release" ? "Release " : "Capture ") + (point ? pointName(point) + " Lv." + point.level : action.areaId) + roleText;
      }).join(" · ");
      var classCounts = { keep: 0, yield: 0, "release-candidate": 0 };
      Object.keys(dayState.ownedClasses || {}).forEach(function (id) {
        classCounts[dayState.ownedClasses[id]] = (classCounts[dayState.ownedClasses[id]] || 0) + 1;
      });
      var slotsText = (dayState.slotsUsed || []).length ? dayState.slotsUsed.map(battleSlotLabel).join(", ") : "none";
      node.innerHTML =
        "<strong>Day " + dayState.day + (isWarDay(dayState.day) ? " · War day" : " · Build day") + "</strong>" +
        '<span class="palette-note">Actions: ' + dayState.actions.length + " · Slots " + slotsText + "</span>" +
        '<span class="palette-note">Safe time ' + dayState.safeTimeHours + 'h · Preferred slot ' + battleSlotLabel(dayState.safeTimeSlot) + "</span>" +
        '<span class="palette-note">Cities ' + dayState.citiesOwned + "/" + dayState.cityCapacity + " · Banks " + dayState.banksOwned + "/" + dayState.bankCapacity + "</span>" +
        '<span class="palette-note">Yield ' + dayState.coin + " Coin/h · " + dayState.influence + " Influence</span>" +
        '<span class="palette-note">Keep ' + classCounts.keep + " · Yield nodes " + classCounts.yield + " · Release candidates " + classCounts["release-candidate"] + "</span>" +
        '<span class="timeline-actions">' + (actionsText || "No actions") + "</span>";
      timelinePanel.appendChild(node);
    });
  }

  function toggleAreaAssignment(pointId, allianceId) {
    var grid = currentGrid();
    if (!grid) return;
    var point = pointById(pointId);
    if (!point || !isAssignable(point)) return;

    var alliances = grid.alliances.map(function (alliance) {
      if (alliance.id !== allianceId) {
        return Object.assign({}, alliance, {
          areaIds: alliance.areaIds.filter(function (id) { return id !== pointId; })
        });
      }

      var hasArea = alliance.areaIds.indexOf(pointId) !== -1;
      return Object.assign({}, alliance, {
        areaIds: hasArea
          ? alliance.areaIds.filter(function (id) { return id !== pointId; })
          : alliance.areaIds.concat(pointId)
      });
    });

    updateGrid(grid.id, { alliances: alliances });
  }

  function togglePathStep(areaId, allianceId) {
    var grid = currentGrid();
    if (!grid) return;

    var currentSteps = routeForAlliance(allianceId);
    var existing = currentSteps.find(function (step) {
      return step.areaId === areaId;
    });
    var nextSteps;

    if (existing) {
      nextSteps = grid.pathSteps
        .filter(function (step) {
          return !(step.areaId === areaId && step.allianceId === allianceId);
        })
        .map(function (step) {
          if (step.allianceId === allianceId && step.step > existing.step) {
            return Object.assign({}, step, { step: step.step - 1 });
          }
          return step;
        });
    } else {
      var nextStepNumber = currentSteps.length ? currentSteps[currentSteps.length - 1].step + 1 : 1;
      nextSteps = grid.pathSteps.concat({
        areaId: areaId,
        allianceId: allianceId,
        step: nextStepNumber
      });
    }

    updateGrid(grid.id, { pathSteps: nextSteps });
  }

  function onPointClick(point) {
    var grid = currentGrid();
    selectedPointId = point.id;

    if (grid && grid.selectedAllianceId && isAssignable(point)) {
      if (grid.proposedPathMode) {
        togglePathStep(point.id, grid.selectedAllianceId);
      } else {
        toggleAreaAssignment(point.id, grid.selectedAllianceId);
      }
    }

    updateSelectionPanel();
    updateRoutePanel();
    render();
  }

  function renderRect(point) {
    var grid = currentGrid();
    var alliance = currentAlliance();
    var routeStep = alliance ? routeStepForPoint(alliance.id, point.id) : null;
    var inRoute = !!routeStep;
    var isSelectedStart = selectedAllianceStartsOn(point.id);
    var isAnyStart = anyAllianceStartsOn(point.id);
    var cells = point.cells && point.cells.length ? point.cells : [point];

    cells.forEach(function (cell, index) {
      var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      var pos = scaledCenter(cell);
      var width = scaledWidth(cell);
      var height = scaledHeight(cell);

      rect.setAttribute("x", pos.x - width / 2);
      rect.setAttribute("y", pos.y - height / 2);
      rect.setAttribute("width", width);
      rect.setAttribute("height", height);
      rect.setAttribute("fill", fillColor(point));
      rect.setAttribute("fill-opacity", fillOpacity(point));
      rect.setAttribute("stroke", isSelectedStart ? "#ffffff" : (inRoute ? stepStrokeColor(routeStep) : (isAnyStart ? "#b8f5ff" : "rgba(10,20,10,0.7)")));
      rect.setAttribute("stroke-width", isSelectedStart ? "4" : (inRoute ? "2.6" : (isAnyStart ? "2.4" : (point.territoryKind === "bank" ? "0.9" : "1.3"))));
      rect.setAttribute("class", "map-cell" + (point.id === selectedPointId ? " is-selected" : "") + (inRoute ? " is-path" + routeRoleClassName(routeStep) : "") + (isSelectedStart ? " is-start" : "") + (!isSelectedStart && isAnyStart ? " is-other-start" : ""));

      if (index === 0) {
        var title = document.createElementNS("http://www.w3.org/2000/svg", "title");
        title.textContent = pointName(point) + " Lv." + point.level + " [" + point.gridX + "," + point.gridY + "]";
        rect.appendChild(title);
      }
      rect.addEventListener("click", function () {
        onPointClick(point);
      });
      elementLayer.appendChild(rect);
    });
  }

  function renderMarker(point) {
    var alliance = currentAlliance();
    var routeStep = alliance ? routeStepForPoint(alliance.id, point.id) : null;
    var inRoute = !!routeStep;
    var isSelectedStart = selectedAllianceStartsOn(point.id);
    var isAnyStart = anyAllianceStartsOn(point.id);
    var pos = center(point);
    var group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", "map-marker" + (point.id === selectedPointId ? " is-selected" : "") + (inRoute ? " is-path" + routeRoleClassName(routeStep) : "") + (isSelectedStart ? " is-start" : "") + (!isSelectedStart && isAnyStart ? " is-other-start" : ""));

    var outer = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    outer.setAttribute("cx", pos.x);
    outer.setAttribute("cy", pos.y);
    outer.setAttribute("r", markerRadius(point) * MAP_SCALE + 10);
    outer.setAttribute("fill", isSelectedStart ? "rgba(255,255,255,0.2)" : "rgba(16,24,16,0.35)");
    group.appendChild(outer);

    var core = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    core.setAttribute("cx", pos.x);
    core.setAttribute("cy", pos.y);
    core.setAttribute("r", markerRadius(point) * MAP_SCALE + 4);
    core.setAttribute("fill", fillColor(point));
    core.setAttribute("class", "map-marker-core");
    if (isSelectedStart) {
      core.setAttribute("stroke", "#ffffff");
      core.setAttribute("stroke-width", 6);
    } else if (inRoute) {
      core.setAttribute("stroke", stepStrokeColor(routeStep));
      core.setAttribute("stroke-width", 5);
    } else if (isAnyStart) {
      core.setAttribute("stroke", "#b8f5ff");
      core.setAttribute("stroke-width", 4);
    }
    group.appendChild(core);

    var title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = pointName(point) + " Lv." + point.level + " [" + point.gridX + "," + point.gridY + "]";
    group.appendChild(title);
    group.addEventListener("click", function () {
      onPointClick(point);
    });
    elementLayer.appendChild(group);
  }

  function shouldShowLabel(point) {
    var grid = currentGrid();
    if (!grid) return false;
    if (point.territoryKind === "sanctuary" || point.territoryKind === "nexus" || point.territoryKind === "outpost") return true;
    if (point.territoryKind === "bank") return grid.showStrongholds;
    if (point.territoryKind === "city") return grid.showCities;
    return false;
  }

  function renderPointLabel(point) {
    if (!shouldShowLabel(point)) return;

    var text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    var pos = scaledCenter(point);
    text.setAttribute("x", pos.x);
    text.setAttribute("y", pos.y + (point.territoryKind === "bank" ? 4 : 5));
    text.setAttribute("class", point.territoryKind === "bank" ? "map-mini-label" : "map-marker-label");
    text.textContent = pointAbbreviation(point);
    labelLayer.appendChild(text);
  }

  function renderWarzoneOverlays() {
    for (var sectorId = 1; sectorId <= 8; sectorId += 1) {
      var bounds = warzoneBounds(sectorId);
      if (!bounds) continue;

      var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", scaledValue(bounds.x));
      rect.setAttribute("y", scaledValue(bounds.y));
      rect.setAttribute("width", scaledValue(bounds.width));
      rect.setAttribute("height", scaledValue(bounds.height));
      rect.setAttribute("rx", 18);
      rect.setAttribute("class", "warzone-overlay");
      rect.setAttribute("fill", WARZONE_COLORS[(sectorId - 1) % WARZONE_COLORS.length]);
      rect.setAttribute("fill-opacity", preferredWarzoneSector() === sectorId ? "0.14" : "0.08");
      rect.setAttribute("stroke", WARZONE_COLORS[(sectorId - 1) % WARZONE_COLORS.length]);
      rect.setAttribute("stroke-opacity", preferredWarzoneSector() === sectorId ? "0.72" : "0.38");
      rect.setAttribute("stroke-width", preferredWarzoneSector() === sectorId ? "3" : "2");
      labelLayer.appendChild(rect);

      var label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", scaledValue(bounds.x + bounds.width / 2));
      label.setAttribute("y", scaledValue(bounds.y + 26));
      label.setAttribute("class", "warzone-label");
      label.textContent = "WZ" + sectorId;
      labelLayer.appendChild(label);
    }
  }

  function renderAllPathLines() {
    var alliance = currentAlliance();
    if (!alliance) return;

    activeRouteForAlliance(alliance.id).forEach(function (step) {
      var point = pointById(step.areaId);
      if (!point) return;
      var pos = center(point);

      var badge = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      badge.setAttribute("cx", pos.x);
      badge.setAttribute("cy", pos.y);
      badge.setAttribute("r", 11);
      badge.setAttribute("class", "map-path-dot" + routeRoleClassName(step));
      badge.setAttribute("fill", stepStrokeColor(step));
      labelLayer.appendChild(badge);

      var text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", pos.x);
      text.setAttribute("y", pos.y + 4);
      text.setAttribute("class", "map-path-text" + routeRoleClassName(step));
      text.textContent = String(step.day || step.step);
      labelLayer.appendChild(text);
    });

    var startArea = startAreaForAlliance(alliance);
    if (!startArea) return;

    var startPos = center(startArea);
    var startBadge = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    startBadge.setAttribute("x", startPos.x - 24);
    startBadge.setAttribute("y", startPos.y - 38);
    startBadge.setAttribute("width", 48);
    startBadge.setAttribute("height", 18);
    startBadge.setAttribute("rx", 9);
    startBadge.setAttribute("class", "map-start-badge");
    labelLayer.appendChild(startBadge);

    var startText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    startText.setAttribute("x", startPos.x);
    startText.setAttribute("y", startPos.y - 25);
    startText.setAttribute("class", "map-start-text");
    startText.textContent = "START";
    labelLayer.appendChild(startText);
  }

  function render() {
    elementLayer.innerHTML = "";
    labelLayer.innerHTML = "";

    renderWarzoneOverlays();
    var visiblePoints = filteredPoints();
    visiblePoints.forEach(function (point) {
      if (point.territoryKind === "sanctuary" || point.territoryKind === "nexus" || point.territoryKind === "outpost") {
        renderMarker(point);
      } else {
        renderRect(point);
      }
    });
    visiblePoints.forEach(renderPointLabel);
    renderAllPathLines();
    syncAlliancePanel();
    updateSelectionPanel();
    updateRoutePanel();
    updateTimelinePanel();

    var grid = currentGrid();
    var selectedAlliance = currentAlliance();
    status.textContent =
      visiblePoints.length + " areas visible" +
      (grid ? " · " + grid.alliances.length + " alliances" : "") +
      (selectedAlliance ? " · selected " + selectedAlliance.name : "");
  }

  function resetView() {
    categoryFilter.value = "";
    levelMinFilter.value = "0";
    selectedPointId = null;
    var grid = currentGrid();
    if (grid) {
      updateGrid(grid.id, {
        showStrongholds: false,
        showCities: true,
        showBuffs: false,
        proposedPathMode: false
      });
      return;
    }
    render();
  }

  function initGrids() {
    grids = loadJson(STORAGE_KEYS.GRIDS, []);
    currentGridId = loadJson(STORAGE_KEYS.CURRENT_GRID_ID, null);

    if (Array.isArray(grids)) {
      grids = grids.map(function (grid, index) {
        return {
          id: grid && grid.id ? grid.id : "s5-restored-" + index,
          name: grid && grid.name ? grid.name : "Season 6 - Restored Grid " + (index + 1),
          alliances: Array.isArray(grid && grid.alliances) ? grid.alliances.map(normalizeAlliance) : [],
          pathSteps: Array.isArray(grid && grid.pathSteps) ? grid.pathSteps : [],
          showStrongholds: !!(grid && grid.showStrongholds),
          showCities: !grid || grid.showCities !== false,
          showBuffs: !!(grid && grid.showBuffs),
          proposedPathMode: !!(grid && grid.proposedPathMode),
          selectedAllianceId: grid && grid.selectedAllianceId ? grid.selectedAllianceId : null,
          createdAt: grid && grid.createdAt ? grid.createdAt : new Date().toISOString(),
          updatedAt: grid && grid.updatedAt ? grid.updatedAt : new Date().toISOString()
        };
      });
    }

    if (!Array.isArray(grids) || !grids.length) {
      grids = [defaultGrid()];
      currentGridId = grids[0].id;
    }

    if (!currentGrid() && grids.length) currentGridId = grids[0].id;
    syncGridControls();
    syncGridSettings();
  }

  function selectGrid(gridId) {
    currentGridId = gridId;
    clearSimulationPreview();
    syncGridControls();
    syncGridSettings();
    render();
    saveJson(STORAGE_KEYS.CURRENT_GRID_ID, currentGridId);
  }

  function createGrid() {
    var name = "Season 6 - Grid " + (grids.length + 1);
    var grid = defaultGrid(name);
    grids.push(grid);
    currentGridId = grid.id;
    persistGridState();
  }

  function duplicateGrid() {
    var grid = currentGrid();
    if (!grid) return;
    var clone = JSON.parse(JSON.stringify(grid));
    clone.id = "s5-" + slug();
    clone.name = grid.name + " (Copy)";
    clone.createdAt = new Date().toISOString();
    clone.updatedAt = new Date().toISOString();
    grids.push(clone);
    currentGridId = clone.id;
    persistGridState();
  }

  function deleteGrid() {
    if (grids.length <= 1) return;
    grids = grids.filter(function (grid) {
      return grid.id !== currentGridId;
    });
    currentGridId = grids[0].id;
    persistGridState();
  }

  function createAlliance() {
    var name = allianceNameInput.value.trim();
    var grid = currentGrid();
    if (!grid) return;
    if (!name) {
      name = "Alliance " + (grid.alliances.length + 1);
    }

    var taken = grid.alliances.map(function (alliance) { return alliance.color; });
    var color = ALLIANCE_COLORS.find(function (candidate) {
      return taken.indexOf(candidate) === -1;
    }) || ALLIANCE_COLORS[0];

    var alliance = {
      id: "ally-" + slug(),
      name: name,
      areaIds: [],
      color: color,
      safeTimeHours: SEASON_CONFIG.battle.safeTimeHours,
      safeTimeSlot: 2,
      priorityRank: grid.alliances.length + 1,
      priorityWeight: Math.max(1, 100 - grid.alliances.length * 5),
      serverSector: Number(warzoneSectorSelect && warzoneSectorSelect.value ? warzoneSectorSelect.value : preferredWarzoneSector())
    };

    updateGrid(grid.id, {
      alliances: grid.alliances.concat(alliance),
      selectedAllianceId: alliance.id
    });
    allianceNameInput.value = "";
  }

  function deleteAlliance(allianceId) {
    var grid = currentGrid();
    if (!grid) return;
    clearSimulationPreview(allianceId);
    updateGrid(grid.id, {
      alliances: grid.alliances.filter(function (alliance) { return alliance.id !== allianceId; }),
      pathSteps: grid.pathSteps.filter(function (step) { return step.allianceId !== allianceId; }),
      selectedAllianceId: grid.selectedAllianceId === allianceId ? null : grid.selectedAllianceId
    });
  }

  function clearAllAlliances() {
    var grid = currentGrid();
    if (!grid) return;
    clearSimulationPreview();
    updateGrid(grid.id, {
      alliances: [],
      pathSteps: [],
      selectedAllianceId: null
    });
  }

  function init() {
    meta.textContent = "Caricamento point model Season 6...";
    initGrids();

    Promise.all([
      loadData(DATASET_URLS.strategic, 0),
      loadData(DATASET_URLS.raw, 0)
    ])
      .then(function (results) {
        var strategicData = results[0];
        var rawData = results[1];
        allPoints = buildAllPoints(strategicData, rawData);
        points = buildPlannerPoints(strategicData, rawData);
        meta.textContent =
          points.length + " aree strategiche Season 6 caricate · POI validati + city/resources";
        render();
        setTimeout(focusGoldenPalace, 50);
      })
      .catch(function (error) {
        meta.textContent = "Errore caricamento points: " + error.message;
        status.textContent = "Season 6 points non disponibili";
      });
  }

  [categoryFilter, levelMinFilter].forEach(function (node) {
    node.addEventListener("change", render);
    node.addEventListener("input", render);
  });

  if (warzoneSectorSelect) {
    warzoneSectorSelect.addEventListener("change", render);
  }

  [showStrongholds, showCities, showBuffs, pathMode].forEach(function (node) {
    node.addEventListener("change", function () {
      var grid = currentGrid();
      if (!grid) return;
      updateGrid(grid.id, {
        showStrongholds: showStrongholds.checked,
        showCities: showCities.checked,
        showBuffs: showBuffs.checked,
        proposedPathMode: pathMode.checked
      });
    });
  });

  gridSelect.addEventListener("change", function () {
    selectGrid(gridSelect.value);
  });
  gridNewButton.addEventListener("click", createGrid);
  gridDuplicateButton.addEventListener("click", duplicateGrid);
  gridDeleteButton.addEventListener("click", deleteGrid);
  if (gridExportButton) gridExportButton.addEventListener("click", exportGrids);
  if (gridImportButton) gridImportButton.addEventListener("click", triggerGridImport);
  if (seedWarzoneButton) seedWarzoneButton.addEventListener("click", createWarzoneAlliancePreset);
  if (simulateRouteButton) simulateRouteButton.addEventListener("click", simulateConquestPath);
  if (setStartButton) setStartButton.addEventListener("click", setAllianceStartArea);
  if (gridImportFile) {
    gridImportFile.addEventListener("change", function (event) {
      var file = event.target.files && event.target.files[0];
      if (!file) return;

      var reader = new FileReader();
      reader.onload = function () {
        try {
          importGridsFromText(String(reader.result || ""));
        } catch (error) {
          alert("Import fallito: " + error.message);
        } finally {
          gridImportFile.value = "";
        }
      };
      reader.onerror = function () {
        alert("Import fallito: impossibile leggere il file");
        gridImportFile.value = "";
      };
      reader.readAsText(file);
    });
  }

  allianceCreateButton.addEventListener("click", createAlliance);
  allianceNameInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") createAlliance();
  });
  allianceClearButton.addEventListener("click", clearAllAlliances);
  allianceList.addEventListener("click", function (event) {
    var target = event.target.closest("[data-action]");
    if (!target) return;
    var action = target.getAttribute("data-action");
    var id = target.getAttribute("data-id");
    if (action === "select") {
      var grid = currentGrid();
      if (!grid) return;
      updateGrid(grid.id, { selectedAllianceId: id });
    } else if (action === "delete") {
      deleteAlliance(id);
    }
  });
  if (solutionList) {
    solutionList.addEventListener("click", function (event) {
      var target = event.target.closest("[data-action]");
      if (!target) return;
      var planIndex = Number(target.getAttribute("data-plan-index"));
      if (!simulationPlans[planIndex]) return;
      if (target.getAttribute("data-action") === "preview-plan") {
        previewPlanIndex = planIndex;
        var alliance = currentAlliance();
        previewAllianceId = alliance ? alliance.id : null;
        renderSimulationPlans();
        render();
        return;
      }
      if (target.getAttribute("data-action") === "apply-plan") {
        applySimulationPlan(simulationPlans[planIndex]);
      }
    });
  }

  clearButton.addEventListener("click", resetView);
  clearPathButton.addEventListener("click", function () {
    var grid = currentGrid();
    var alliance = currentAlliance();
    if (!grid || !alliance) return;
    clearSimulationPreview(alliance.id);
    updateGrid(grid.id, {
      pathSteps: grid.pathSteps.filter(function (step) {
        return step.allianceId !== alliance.id;
      })
    });
  });
  centerButton.addEventListener("click", function () {
    focusGoldenPalace();
  });

  drawGrid();
  init();
})();
