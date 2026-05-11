const firebaseConfig = {
  // bio-bank-staging
  // apiKey: "AIzaSyD1xIWztyMkS7v3Cozp5J0Dtvaa9JlF0BM",
  // authDomain: "bio-bank-staging.firebaseapp.com",
  // databaseURL: "https://bio-bank-staging-default-rtdb.firebaseio.com/",
  // projectId: "bio-bank-staging",
  // storageBucket: "bio-bank-staging.firebasestorage.app",
  // messagingSenderId: "1054710609145",
  // appId: "1:1054710609145:web:2afcbf429677d7ca42de28",
  // measurementId: "G-CKEH775B84",

  // biobank-development
  apiKey: "AIzaSyDIFI_4lVb7FJmKgzWMbq6ZfKcBwpj-K4E",
  authDomain: "biobank-development.firebaseapp.com",
  databaseURL: "https://biobank-development-default-rtdb.firebaseio.com",
  projectId: "biobank-development",
  storageBucket: "biobank-development.firebasestorage.app",
  messagingSenderId: "31278898937",
  appId: "1:31278898937:web:01f96df7a640d9c1410c28",
  measurementId: "G-B98TGR5Q8Q",

  // bio-bank-deployment
  // apiKey: "AIzaSyCbpb_1jb6mDvF_7kuN8J0lwIoW7-mKd8g",
  // authDomain: "bio-bank-deployment.firebaseapp.com",
  // databaseURL: "https://bio-bank-deployment-default-rtdb.firebaseio.com",
  // projectId: "bio-bank-deployment",
  // storageBucket: "bio-bank-deployment.firebasestorage.app",
  // messagingSenderId: "674946404975",
  // appId: "1:674946404975:web:777e4171f5b473e6b3f39a",
  // measurementId: "G-MQP97GW8F9",
};

let currentBloodBoxIndex = 0;
let boxKeys = [];

function populateBBData(debug) {
  const path = "bb/";
  var boxVal = "";
  db.ref(path)
    .once("value")
    .then((snapshot) => {
      const boxes = snapshot.val();
      if (boxes) {
        boxKeys = Object.keys(boxes); // Populate boxKeys here

        const activeBoxIndex = boxKeys.findIndex((boxKey) => boxes[boxKey].bxsts === "AC");

        if (activeBoxIndex !== -1) {
          currentBloodBoxIndex = activeBoxIndex;
        } else {
          console.warn('No active box found with bxsts = "AC".');
        }

        boxVal = boxKeys[currentBloodBoxIndex]; // Use the determined or default index

        db.ref("bn/" + boxVal)
          .once("value")
          .then((snapshot) => {
            if (snapshot.exists()) {
              const boxName = snapshot.val();

              document.getElementById("box_id").textContent = boxName;
            } else {
              console.log("No box found with ID " + boxVal);
            }
          })
          .catch((error) => {
            console.error("Error fetching box name for ID " + boxVal + ": ", error);
          });

        return db.ref(`bb/${boxVal}/`).once("value");
      } else {
        const container = document.getElementById("blood-box-container");
        container.innerHTML = `
       Add Box in to the container
      `;
      }
    })
    .then((snapshot) => {
      const data = snapshot.val();
      if (data) {
        populateBBLabels(data, boxVal, "call from populateBBData");
      }
    })
    .catch((error) => {
      console.error("Error fetching data from Firebase:", error);
    });
}

function populateBBLabels(data, boxVal, debug) {
  const rows = "ABCDEFGHIJ";
  const cols = 10;

  const bioBankIds = Object.keys(data).map((key) => data[key].bioBankId);
  const sts = Object.keys(data).map((key) => data[key].status);
  const sample = Object.keys(data).map((key) => data[key].sampleType);

  if (bioBankIds.length < 100) {
    console.warn("Not enough bioBankIds available for the matrix.");
  }

  for (let row = 0; row < rows.length; row++) {
    for (let col = 1; col <= cols; col++) {
      const labelName = `label_B${rows[row]}${col}`;
      const labelElement = document.getElementById(labelName);
      const index = getColumnMajorIndex(row, col, rows.length);

      if (labelElement) {
        if (bioBankIds[index] !== "") {
          labelElement.innerHTML = `${bioBankIds[index] || ""}<br>${sample[index] || ""}`;
          labelElement.style.fontWeight = "bold";
        } else if (bioBankIds[index] === "") {
          labelElement.innerHTML = `${"-"}<br>${"-"}`;
        }

        const newLabelElement = labelElement.cloneNode(true);
        labelElement.parentNode.replaceChild(newLabelElement, labelElement);

        if (sts[index] === "o") {
          newLabelElement.style.background = "rgb(129, 129, 192)";
          const matchedData = [];
          newLabelElement.addEventListener("click", async function () {
            const bioBankId = bioBankIds[index];
            const sampleType = sample[index];

            const dbRef = db.ref(`sef/${bioBankId}`);
            const snapshot = await dbRef.get();

            if (!snapshot.exists()) {
              console.log("No data found for bioBankId:", bioBankId);
              return;
            }

            const dbData = snapshot.val();

            Object.keys(dbData).forEach((seqNum) => {
              const seqData = dbData[seqNum];

              const latestTimestamp = Math.max(...Object.keys(seqData));

              const timestampData = seqData[latestTimestamp];

              if ((sampleType === "Plasma" || sampleType === "MPlasma") && timestampData.ie.bpg) {
                const bpg = timestampData.ie.bpg;
                const boxName = bpg.split("/")[0];
                const bpgIndex1 = bpg.split("/")[1];

                if (bpgIndex1 && bpgIndex1.includes(getSeatLabel(index))) {
                  matchedData.push({
                    mode: "SearchView",
                    bioBankId,
                    seq: seqNum,
                    timestamp: latestTimestamp,
                  });
                }
              }

              if ((sampleType === "Serum" || sampleType === "MSerum") && timestampData.ie.bsg) {
                const bsg = timestampData.ie.bsg;

                console.log("bsgIndex1", getSeatLabel(index));
                const bsgIndex1 = bsg.split("/")[1]; // get index1

                if (bsgIndex1 && bsgIndex1.includes(getSeatLabel(index))) {
                  matchedData.push({
                    mode: "SearchView",
                    bioBankId,
                    seq: seqNum,
                    timestamp: latestTimestamp,
                  });
                }
              }

              if ((sampleType === "Buffy Coat" || sampleType === "MBuffy Coat") && timestampData.ie.bbcg) {
                const bbcg = timestampData.ie.bbcg;

                const bbcgIndex1 = bbcg.split("/")[1];

                if (bbcgIndex1 && bbcgIndex1.includes(getSeatLabel(index))) {
                  matchedData.push({
                    mode: "SearchView",
                    bioBankId,
                    seq: seqNum,
                    timestamp: latestTimestamp,
                  });
                }
              }

              if ((sampleType === "Other" || sampleType === "MOther") && timestampData.ie.osg) {
                const osg = timestampData.ie.osg;

                const osgIndex1 = osg.split("/")[1];

                if (osgIndex1 && osgIndex1.includes(getSeatLabel(index))) {
                  matchedData.push({
                    mode: "SearchView",
                    bioBankId,
                    seq: seqNum,
                    timestamp: latestTimestamp,
                  });
                }
              }
            });

            if (matchedData.length > 0) {
              matchedData.forEach((item) => {
                pages_display(item.mode, item.bioBankId, item.seq, item.timestamp);
              });
            } else {
              console.log("No match found for:", matchedData);
            }
          });
        }

        if (sts[index] === "s") {
          newLabelElement.style.background = "rgb(180, 180, 180)";

          const matchedData = [];

          newLabelElement.addEventListener("click", async function () {
            const bioBankId = bioBankIds[index];
            const sampleType = sample[index];

            localStorage.setItem("sharedbioid", bioBankId);

            const dbRef = db.ref(`sef/${bioBankId}`);
            const snapshot = await dbRef.get();

            if (!snapshot.exists()) {
              console.log("No data found for bioBankId:", bioBankId);
              return;
            }

            const dbData = snapshot.val();

            Object.keys(dbData).forEach((seqNum) => {
              const seqData = dbData[seqNum];

              Object.keys(seqData).forEach((timestamp) => {
                const timestampData = seqData[timestamp];

                if ((sampleType === "Plasma" || sampleType === "MPlasma") && timestampData.ie) {
                  const bpg = timestampData.ie.bpg;
                  const boxName = bpg.split("/")[0];
                  const bpgIndex1 = bpg.split("/")[1];

                  if (bpgIndex1 && bpgIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp,
                    });
                  }
                }
                if ((sampleType === "Serum" || sampleType === "MSerum") && timestampData.ie) {
                  const bsg = timestampData.ie.bsg;

                  const boxName = bsg.split("/")[0];
                  const bsgIndex1 = bsg.split("/")[1]; // get index1

                  if (bsgIndex1 && bsgIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp,
                    });
                  }
                }
                if ((sampleType === "Buffy Coat" || sampleType === "MBuffy Coat") && timestampData.ie) {
                  const bbcg = timestampData.ie.bbcg;

                  if (bbcg !== undefined) {
                    const boxName = bbcg.split("/")[0];
                    const bbcgIndex1 = bbcg.split("/")[1];

                    if (bbcgIndex1 && bbcgIndex1.includes(getSeatLabel(index))) {
                      matchedData.push({
                        mode: "sharedView",
                        boxName,
                        bioBankId,
                        seq: seqNum,
                        timestamp,
                      });
                    }
                  }
                }
                if ((sampleType === "Other" || sampleType === "MOther") && timestampData.ie) {
                  const osg = timestampData.ie.osg;

                  const boxName = osg.split("/")[0];
                  const osgIndex1 = osg.split("/")[1];

                  if (osgIndex1 && osgIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp,
                    });
                  }
                }
              });
            });

            if (matchedData.length > 0) {
              matchedData.forEach((item) => {
                shared_pages_display(item.mode, item.bioBankId, item.seq, item.boxName, item.timestamp);
              });
            } else {
              console.log("No match found for:", labelName);
            }
          });
        }

        if (sts[index] === "ps") {
          newLabelElement.style.background = "rgb(193, 154, 107)";
          const matchedData = [];

          newLabelElement.addEventListener("click", async function () {
            const bioBankId = bioBankIds[index];
            const sampleType = sample[index];

            localStorage.setItem("sharedbioid", bioBankId);

            const dbRef = db.ref(`sef/${bioBankId}`);
            const snapshot = await dbRef.get();

            if (!snapshot.exists()) {
              console.log("No data found for bioBankId:", bioBankId);
              return;
            }

            const dbData = snapshot.val();

            Object.keys(dbData).forEach((seqNum) => {
              const seqData = dbData[seqNum];

              Object.keys(seqData).forEach((timestamp) => {
                const timestampData = seqData[timestamp];

                if ((sampleType === "Plasma" || sampleType === "MPlasma") && timestampData.ie) {
                  const bpg = timestampData.ie.bpg;

                  if (bpg !== undefined) {
                    const boxName = bpg.split("/")[0];
                    const bpgIndex1 = bpg.split("/")[1];

                    if (bpgIndex1 && bpgIndex1.includes(getSeatLabel(index))) {
                      matchedData.push({
                        mode: "sharedView",
                        boxName,
                        bioBankId,
                        seq: seqNum,
                        timestamp,
                      });
                    }
                  }
                }
                if ((sampleType === "Serum" || sampleType === "MSerum") && timestampData.ie) {
                  const bsg = timestampData.ie.bsg;

                  const boxName = bsg.split("/")[0];
                  const bsgIndex1 = bsg.split("/")[1]; // get index1

                  if (bsgIndex1 && bsgIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp,
                    });
                  }
                }
                if ((sampleType === "Buffy Coat" || sampleType === "MBuffy Coat") && timestampData.ie) {
                  const bbcg = timestampData.ie.bbcg;

                  const boxName = bbcg.split("/")[0];
                  const bbcgIndex1 = bbcg.split("/")[1];

                  if (bbcgIndex1 && bbcgIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp,
                    });
                  }
                }
                if ((sampleType === "Other" || sampleType === "MOther") && timestampData.ie) {
                  const osg = timestampData.ie.osg;

                  const boxName = osg.split("/")[0];
                  const osgIndex1 = osg.split("/")[1];

                  if (osgIndex1 && osgIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp,
                    });
                  }
                }
              });
            });

            if (matchedData.length > 0) {
              matchedData.forEach((item) => {
                shared_pages_display(item.mode, item.bioBankId, item.seq, item.boxName, item.timestamp);
              });
            } else {
              console.log("No match found for:", labelName);
            }
          });
        }

        if (sts[index] === "e") {
          newLabelElement.style.background = "rgb(143, 218, 187)";

          newLabelElement.addEventListener("click", function () {
            localStorage.removeItem("MRN");
            openModal();
          });
        }
      }
    }
  }
}

function getColumnMajorIndex(rowIndex, colNumber, rowCount) {
  return (colNumber - 1) * rowCount + rowIndex;
}

function getSeatLabel(index) {
  const rows = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

  const rowIndex = Math.floor(index / rows.length); // Get the column index (zero-based)
  const colIndex = index % rows.length; // Get the row index (zero-based)

  const rowLetter = rows[rowIndex]; // Get the corresponding row letter
  const colNumber = colIndex + 1; // Convert zero-based index to 1-based column number

  return `${rowLetter}${colNumber}`; // Return seat label (e.g., 'C6')
}

function prev1Box() {
  if (currentBloodBoxIndex > 0) {
    loadBBox(); // Call loadBox to show the loading spinner
    currentBloodBoxIndex--;
    populateBBDataForCurrentBox();
  }
}

function next1Box() {
  if (currentBloodBoxIndex < boxKeys.length - 1) {
    loadBBox(); // Call loadBox to show the loading spinner
    currentBloodBoxIndex++;
    populateBBDataForCurrentBox();
  }
}

function loadBBox() {
  event.preventDefault();

  const container = document.getElementById("blood-box-container");
  var loadprogress = document.getElementById("Bloadprogress");
  loadprogress.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Loading...
      `;
  loadprogress.style.display = "block";

  container.style.display = "none";

  setTimeout(() => {
    loadprogress.innerHTML = "";
    loadprogress.style.display = "none";
    container.style.display = "block";
  }, 1000);
}

function populateBBDataForCurrentBox() {
  const boxVal = boxKeys[currentBloodBoxIndex]; // Use the current index

  db.ref("bn/" + boxVal)
    .once("value")
    .then((snapshot) => {
      if (snapshot.exists()) {
        const boxName = snapshot.val();

        document.getElementById("box_id").textContent = boxName;
      } else {
        console.log("No box found with ID " + boxVal);
      }
    })
    .catch((error) => {
      console.error("Error fetching box name for ID " + boxVal + ": ", error);
    });
  db.ref(`bb/${boxVal}/`)
    .once("value")
    .then((snapshot) => {
      const data = snapshot.val();
      if (data) {
        populateBBLabels(data, boxVal, "call from populateBBDataForCurrentBox");
      }
    })
    .catch((error) => {
      console.error("Error fetching data from Firebase:", error);
    });
}
window.onload = function () {
  let bnLocalS = [];

  db.ref("bn/")
    .once("value")
    .then((snapshot) => {
      if (snapshot.exists()) {
        const boxIDs = snapshot.val();

        let bnLocalS = [];

        for (const [key, value] of Object.entries(boxIDs)) {
          bnLocalS.push({ id: key, name: value });
        }
        localStorage.setItem("bnData", JSON.stringify(bnLocalS));
      }
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
    });
};

function test1() {
  populateBBData();
}

let currentSpecimenBoxIndex = 0;
let sBBoxKeys = [];

function populateSBData() {
  const path = "sb/";

  db.ref(path)
    .once("value")
    .then((snapshot) => {
      const boxes = snapshot.val();
      if (boxes) {
        sBBoxKeys = Object.keys(boxes);

        const activeBoxIndex = sBBoxKeys.findIndex((sBBoxKeys) => boxes[sBBoxKeys].bxsts === "AC");

        if (activeBoxIndex !== -1) {
          currentSpecimenBoxIndex = activeBoxIndex;
        } else {
          console.warn('No active box found with bxsts = "AC".');
        }

        const boxVal = sBBoxKeys[currentSpecimenBoxIndex];

        db.ref("bn/" + boxVal)
          .once("value")
          .then((snapshot) => {
            if (snapshot.exists()) {
              const boxName = snapshot.val();

              document.getElementById("sbox_id").textContent = boxName;
            } else {
              console.log("No box found with ID " + boxVal);
            }
          })
          .catch((error) => {
            console.error("Error fetching box name for ID " + boxVal + ": ", error);
          });

        return db.ref(`sb/${boxVal}/`).once("value");
      } else {
        const container = document.getElementById("specimen-box-container");
        container.innerHTML = `
       Add Box in to the container
      `;
      }
    })
    .then((snapshot) => {
      const data = snapshot.val();
      if (data) {
        populateSBLabels(data);
      }
    })
    .catch((error) => {
      console.error("Error fetching data from Firebase:", error);
    });
}

function populateSBLabels(data) {
  const rows = "ABCDEFGHIJ";
  const cols = 10;

  const bioBankIds = Object.keys(data).map((key) => data[key].bioBankId);
  const sts = Object.keys(data).map((key) => data[key].status);
  const sample = Object.keys(data).map((key) => data[key].sampleType);

  if (bioBankIds.length < 100) {
    console.warn("Not enough bioBankIds available for the matrix.");
  }

  for (let row = 0; row < rows.length; row++) {
    for (let col = 1; col <= cols; col++) {
      const labelName = `label_S${rows[row]}${col}`;
      const labelElement = document.getElementById(labelName);
      const index = getColumnMajorIndex(row, col, rows.length);

      if (labelElement) {
        if (bioBankIds[index] !== "") {
          labelElement.innerHTML = `${bioBankIds[index] || ""}<br>${sample[index] || ""}`;
          labelElement.style.fontWeight = "bold";
        } else if (bioBankIds[index] === "") {
          labelElement.innerHTML = `${"-"}<br>${"-"}`;
        }

        const newLabelElement = labelElement.cloneNode(true);
        labelElement.parentNode.replaceChild(newLabelElement, labelElement);

        if (sts[index] === "o") {
          newLabelElement.style.background = "rgb(129, 129, 192)";
          const matchedData = [];
          newLabelElement.addEventListener("click", async function () {
            const bioBankId = bioBankIds[index];
            const sampleType = sample[index];

            const dbRef = db.ref(`sef/${bioBankId}`);
            const snapshot = await dbRef.get();

            if (!snapshot.exists()) {
              console.log("No data found for bioBankId:", bioBankId);
              return;
            }

            const dbData = snapshot.val();

            Object.keys(dbData).forEach((seqNum) => {
              const seqData = dbData[seqNum];

              const latestTimestamp = Math.max(...Object.keys(seqData));

              const timestampData = seqData[latestTimestamp];

              if ((sampleType.includes("FT") || sampleType.includes("MFT")) && timestampData.ie.ftg) {
                const ftg = timestampData.ie.ftg;
                const boxName = ftg.split("/")[0];
                const ftgIndex1 = ftg.split("/")[1];

                if (ftgIndex1 && ftgIndex1.includes(getSeatLabel(index))) {
                  matchedData.push({
                    mode: "SearchView",
                    bioBankId,
                    seq: seqNum,
                    timestamp: latestTimestamp,
                  });
                }
              }

              if ((sampleType.includes("FN") || sampleType.includes("MFN")) && timestampData.ie.fng) {
                const fng = timestampData.ie.fng;
                const boxName = fng.split("/")[0];
                const fngIndex1 = fng.split("/")[1];

                if (fngIndex1 && fngIndex1.includes(getSeatLabel(index))) {
                  matchedData.push({
                    mode: "SearchView",
                    bioBankId,
                    seq: seqNum,
                    timestamp: latestTimestamp,
                  });
                }
              }
            });

            if (matchedData.length > 0) {
              matchedData.forEach((item) => {
                pages_display(item.mode, item.bioBankId, item.seq, item.timestamp);
              });
            } else {
              console.log("No match found for:", labelName);
            }
          });
        }

        if (sts[index] === "s") {
          newLabelElement.style.background = "rgb(180, 180, 180)";
          const matchedData = [];

          newLabelElement.addEventListener("click", async function () {
            const bioBankId = bioBankIds[index];
            const sampleType = sample[index];

            localStorage.setItem("sharedbioid", bioBankId);

            const dbRef = db.ref(`sef/${bioBankId}`);
            const snapshot = await dbRef.get();

            if (!snapshot.exists()) {
              console.log("No data found for bioBankId:", bioBankId);
              return;
            }

            const dbData = snapshot.val();

            Object.keys(dbData).forEach((seqNum) => {
              const seqData = dbData[seqNum];

              Object.keys(seqData).forEach((timestamp) => {
                const timestampData = seqData[timestamp];

                if ((sampleType.includes("FT") || sampleType.includes("MFT")) && timestampData.ie.ftg) {
                  const ftg = timestampData.ie.ftg;
                  const boxName = ftg.split("/")[0];
                  const ftgIndex1 = ftg.split("/")[1];

                  if (ftgIndex1 && ftgIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp,
                    });
                  }
                }
                if ((sampleType.includes("FN") || sampleType.includes("MFN")) && timestampData.ie.fng) {
                  const fng = timestampData.ie.fng;

                  const boxName = fng.split("/")[0];
                  const fngIndex1 = fng.split("/")[1]; // get index1

                  if (fngIndex1 && fngIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp,
                    });
                  }
                }
              });
            });

            if (matchedData.length > 0) {
              matchedData.forEach((item) => {
                shared_pages_display(item.mode, item.bioBankId, item.seq, item.boxName, item.timestamp);
              });
            } else {
              console.log("No match found for:", labelName);
            }
          });
        }
        if (sts[index] === "ps") {
          newLabelElement.style.background = "rgb(193, 154, 107)";
          const matchedData = [];

          newLabelElement.addEventListener("click", async function () {
            const bioBankId = bioBankIds[index];
            const sampleType = sample[index];

            localStorage.setItem("sharedbioid", bioBankId);

            const dbRef = db.ref(`sef/${bioBankId}`);
            const snapshot = await dbRef.get();

            if (!snapshot.exists()) {
              console.log("No data found for bioBankId:", bioBankId);
              return;
            }

            const dbData = snapshot.val();

            Object.keys(dbData).forEach((seqNum) => {
              const seqData = dbData[seqNum];

              Object.keys(seqData).forEach((timestamp) => {
                const timestampData = seqData[timestamp];

                if ((sampleType.includes("FT") || sampleType.includes("MFT")) && timestampData.ie) {
                  const ftg = timestampData.ie.ftg;
                  const boxName = ftg.split("/")[0];
                  const ftgIndex1 = ftg.split("/")[1];

                  if (ftgIndex1 && ftgIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp,
                    });
                  }
                }
                if ((sampleType.includes("FN") || sampleType.includes("MFN")) && timestampData.ie) {
                  const fng = timestampData.ie.fng;

                  const boxName = fng.split("/")[0];
                  const fngIndex1 = fng.split("/")[1]; // get index1

                  if (fngIndex1 && fngIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp,
                    });
                  }
                }
              });
            });

            if (matchedData.length > 0) {
              matchedData.forEach((item) => {
                shared_pages_display(item.mode, item.bioBankId, item.seq, item.boxName, item.timestamp);
              });
            } else {
              console.log("No match found for:", labelName);
            }
          });
        }
        if (sts[index] === "e") {
          newLabelElement.style.background = "rgb(143, 218, 187)";

          newLabelElement.addEventListener("click", function () {
            openModal();
          });
        }
      }
    }
  }
}

function prev2Box() {
  if (currentSpecimenBoxIndex > 0) {
    loadSBox();
    currentSpecimenBoxIndex--;
    populateSBDataForCurrentBox();
  }
}

function next2Box() {
  if (currentSpecimenBoxIndex < sBBoxKeys.length - 1) {
    loadSBox();
    currentSpecimenBoxIndex++;
    populateSBDataForCurrentBox();
  }
}

function loadSBox() {
  event.preventDefault();

  const container = document.getElementById("specimen-box-container");
  var loadprogress = document.getElementById("Sloadprogress");
  loadprogress.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Loading...
      `;
  loadprogress.style.display = "block";

  container.style.display = "none";

  setTimeout(() => {
    loadprogress.innerHTML = "";
    loadprogress.style.display = "none";

    container.style.display = "block";
    populateSBDataForCurrentBox();
  }, 1000);
}

function populateSBDataForCurrentBox() {
  const boxVal = sBBoxKeys[currentSpecimenBoxIndex];

  db.ref("bn/" + boxVal)
    .once("value")
    .then((snapshot) => {
      if (snapshot.exists()) {
        const boxName = snapshot.val();

        document.getElementById("sbox_id").textContent = boxName;
      } else {
        console.log("No box found with ID " + boxVal);
      }
    })
    .catch((error) => {
      console.error("Error fetching box name for ID " + boxVal + ": ", error);
    });
  db.ref(`sb/${boxVal}/`)
    .once("value")
    .then((snapshot) => {
      const data = snapshot.val();
      if (data) {
        populateSBLabels(data);
      }
    })
    .catch((error) => {
      console.error("Error fetching data from Firebase:", error);
    });
}

function test2() {
  populateSBData();
}

let currentRLTBoxIndex = 0;
let RLTboxKeys = [];

function populateRLTData(debug) {
  const path = "rlt/";

  var boxVal = "";
  db.ref(path)
    .once("value")
    .then((snapshot) => {
      const boxes = snapshot.val();
      if (boxes) {
        RLTboxKeys = Object.keys(boxes); // Populate boxKeys here

        const activeBoxIndex = RLTboxKeys.findIndex((boxKey) => boxes[boxKey].bxsts === "AC");

        if (activeBoxIndex !== -1) {
          currentRLTBoxIndex = activeBoxIndex;
        } else {
          console.warn('No active box found with bxsts = "AC".');
        }

        boxVal = RLTboxKeys[currentRLTBoxIndex]; // Use the determined or default index

        db.ref("bn/" + boxVal)
          .once("value")
          .then((snapshot) => {
            if (snapshot.exists()) {
              const boxName = snapshot.val();

              document.getElementById("rltBox_id").textContent = boxName;
            } else {
              console.log("No box found with ID " + boxVal);
            }
          })
          .catch((error) => {
            console.error("Error fetching box name for ID " + boxVal + ": ", error);
          });

        return db.ref(`rlt/${boxVal}/`).once("value");
      } else {
        const container = document.getElementById("RLT-box-container");
        container.innerHTML = `
       Add Box in to the container
      `;
      }
    })
    .then((snapshot) => {
      const data = snapshot.val();
      if (data) {
        populateRLTLabels(data, boxVal, "call from populateBBData");
      }
    })
    .catch((error) => {
      console.error("Error fetching data from Firebase:", error);
    });
}

function populateRLTLabels(data, boxVal, debug) {
  const rows = "ABCDEFGHIJ";
  const cols = 10;

  const bioBankIds = Object.keys(data).map((key) => data[key].bioBankId);
  const sts = Object.keys(data).map((key) => data[key].status);
  const sample = Object.keys(data).map((key) => data[key].sampleType);

  if (bioBankIds.length < 100) {
    console.warn("Not enough bioBankIds available for the matrix.");
  }

  for (let row = 0; row < rows.length; row++) {
    for (let col = 1; col <= cols; col++) {
      const labelName = `label_R${rows[row]}${col}`;
      const labelElement = document.getElementById(labelName);
      const index = getColumnMajorIndex(row, col, rows.length);

      if (labelElement) {
        if (bioBankIds[index] !== "") {
          labelElement.innerHTML = `${bioBankIds[index] || ""}<br>${sample[index] || ""}`;
          labelElement.style.fontWeight = "bold";
        } else if (bioBankIds[index] === "") {
          labelElement.innerHTML = `${"-"}<br>${"-"}`;
        }

        const newLabelElement = labelElement.cloneNode(true);
        labelElement.parentNode.replaceChild(newLabelElement, labelElement);

        if (sts[index] === "o") {
          newLabelElement.style.background = "rgb(129, 129, 192)";
          const matchedData = [];
          newLabelElement.addEventListener("click", async function () {
            const bioBankId = bioBankIds[index];
            const sampleType = sample[index];

            const dbRef = db.ref(`sef/${bioBankId}`);
            const snapshot = await dbRef.get();

            if (!snapshot.exists()) {
              console.log("No data found for bioBankId:", bioBankId);
              return;
            }

            const dbData = snapshot.val();

            Object.keys(dbData).forEach((seqNum) => {
              const seqData = dbData[seqNum];

              const latestTimestamp = Math.max(...Object.keys(seqData));

              const timestampData = seqData[latestTimestamp];

              if ((sampleType === "RLT" || sampleType === "RLT") && timestampData.ie.rlt) {
                const rlt = timestampData.ie.rlt;
                const boxName = rlt.split("/")[0];
                const rltIndex1 = rlt.split("/")[1];

                if (rltIndex1 && rltIndex1.includes(getSeatLabel(index))) {
                  matchedData.push({
                    mode: "SearchView",
                    bioBankId,
                    seq: seqNum,
                    timestamp: latestTimestamp,
                  });
                }
              }
            });

            if (matchedData.length > 0) {
              matchedData.forEach((item) => {
                pages_display(item.mode, item.bioBankId, item.seq, item.timestamp);
              });
            } else {
              console.log("No match found for:", labelName);
            }
          });
        }

        if (sts[index] === "s") {
          newLabelElement.style.background = "rgb(180, 180, 180)";
          const matchedData = [];

          newLabelElement.addEventListener("click", async function () {
            const bioBankId = bioBankIds[index];
            const sampleType = sample[index];

            localStorage.setItem("sharedbioid", bioBankId);

            const dbRef = db.ref(`sef/${bioBankId}`);
            const snapshot = await dbRef.get();

            if (!snapshot.exists()) {
              console.log("No data found for bioBankId:", bioBankId);
              return;
            }

            const dbData = snapshot.val();

            Object.keys(dbData).forEach((seqNum) => {
              const seqData = dbData[seqNum];

              Object.keys(seqData).forEach((timestamp) => {
                const timestampData = seqData[timestamp];

                if ((sampleType === "RLT" || sampleType === "RLT") && timestampData.ie.rlt) {
                  const rlt = timestampData.ie.rlt;
                  const boxName = rlt.split("/")[0];
                  const rltIndex1 = rlt.split("/")[1];

                  if (rltIndex1 && rltIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp,
                    });
                  }
                }
              });
            });

            if (matchedData.length > 0) {
              matchedData.forEach((item) => {
                shared_pages_display(item.mode, item.bioBankId, item.seq, item.boxName, item.timestamp);
              });
            } else {
              console.log("No match found for:", labelName);
            }
          });
        }

        if (sts[index] === "ps") {
          newLabelElement.style.background = "rgb(193, 154, 107)";
          const matchedData = [];
          newLabelElement.addEventListener("click", async function () {
            const bioBankId = bioBankIds[index];
            const sampleType = sample[index];

            localStorage.setItem("sharedbioid", bioBankId);

            const dbRef = db.ref(`sef/${bioBankId}`);
            const snapshot = await dbRef.get();

            if (!snapshot.exists()) {
              console.log("No data found for bioBankId:", bioBankId);
              return;
            }

            const dbData = snapshot.val();

            Object.keys(dbData).forEach((seqNum) => {
              const seqData = dbData[seqNum];

              Object.keys(seqData).forEach((timestamp) => {
                const timestampData = seqData[timestamp];

                if ((sampleType === "RLT" || sampleType === "RLT") && timestampData.ie.rlt) {
                  const rlt = timestampData.ie.rlt;
                  const boxName = rlt.split("/")[0];
                  const rltIndex1 = rlt.split("/")[1];

                  if (rltIndex1 && rltIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp,
                    });
                  }
                }
              });
            });

            if (matchedData.length > 0) {
              matchedData.forEach((item) => {
                shared_pages_display(item.mode, item.bioBankId, item.seq, item.boxName, item.timestamp);
              });
            } else {
              console.log("No match found for:", labelName);
            }
          });
        }

        if (sts[index] === "e") {
          newLabelElement.style.background = "rgb(143, 218, 187)";

          newLabelElement.addEventListener("click", function () {
            localStorage.removeItem("MRN");
            openModal();
          });
        }
      }
    }
  }
}

function prev3Box() {
  if (currentRLTBoxIndex > 0) {
    loadRLTBox();
    currentRLTBoxIndex--;
    populateRLTDataForCurrentBox();
  }
}

function next3Box() {
  if (currentRLTBoxIndex < RLTboxKeys.length - 1) {
    loadRLTBox(); // Call loadBox to show the loading spinner
    currentRLTBoxIndex++;
    populateRLTDataForCurrentBox();
  }
}

function loadRLTBox() {
  event.preventDefault();

  const container = document.getElementById("RLT-box-container");
  var loadprogress = document.getElementById("Rloadprogress");
  loadprogress.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Loading...
      `;
  loadprogress.style.display = "block";

  container.style.display = "none";

  setTimeout(() => {
    loadprogress.innerHTML = "";
    loadprogress.style.display = "none";

    container.style.display = "block";
    populateRLTDataForCurrentBox();
  }, 1000);
}

function populateRLTDataForCurrentBox() {
  const boxVal = RLTboxKeys[currentRLTBoxIndex]; // Use the current index

  db.ref("bn/" + boxVal)
    .once("value")
    .then((snapshot) => {
      if (snapshot.exists()) {
        const boxName = snapshot.val();

        document.getElementById("rltBox_id").textContent = boxName;
      } else {
        console.log("No box found with ID " + boxVal);
      }
    })
    .catch((error) => {
      console.error("Error fetching box name for ID " + boxVal + ": ", error);
    });
  db.ref(`rlt/${boxVal}/`)
    .once("value")
    .then((snapshot) => {
      const data = snapshot.val();
      if (data) {
        populateRLTLabels(data, boxVal, "call from populateBBDataForCurrentBox");
      }
    })
    .catch((error) => {
      console.error("Error fetching data from Firebase:", error);
    });
}

function test3() {
  populateRLTData();
}

let currentPCBoxIndex = 0;
let PCboxKeys = [];

function populatePCBData(debug) {
  const path = "pcb/";

  var boxVal = "";
  db.ref(path)
    .once("value")
    .then((snapshot) => {
      const boxes = snapshot.val();
      if (boxes) {
        PCboxKeys = Object.keys(boxes); // Populate boxKeys here

        const activeBoxIndex = PCboxKeys.findIndex((boxKey) => boxes[boxKey].bxsts === "AC");

        if (activeBoxIndex !== -1) {
          currentPCBoxIndex = activeBoxIndex;
        } else {
          console.warn('No active box found with bxsts = "AC".');
        }

        boxVal = PCboxKeys[currentPCBoxIndex]; // Use the determined or default index

        db.ref("bn/" + boxVal)
          .once("value")
          .then((snapshot) => {
            if (snapshot.exists()) {
              const boxName = snapshot.val();

              document.getElementById("pcBox_id").textContent = boxName;
            } else {
              console.log("No box found with ID " + boxVal);
            }
          })
          .catch((error) => {
            console.error("Error fetching box name for ID " + boxVal + ": ", error);
          });

        return db.ref(`pcb/${boxVal}/`).once("value");
      } else {
        const container = document.getElementById("Primary-box-container");
        container.innerHTML = `
       Add Box in to the container
      `;
      }
    })
    .then((snapshot) => {
      const data = snapshot.val();
      if (data) {
        populatePCBLabels(data, boxVal, "call from populateBBData");
      }
    })
    .catch((error) => {
      console.error("Error fetching data from Firebase:", error);
    });
}

function populatePCBLabels(data, boxVal, debug) {
  const rows = "ABCDEFGHIJ";
  const cols = 10;

  const bioBankIds = Object.keys(data).map((key) => data[key].bioBankId);
  const sts = Object.keys(data).map((key) => data[key].status);
  const sample = Object.keys(data).map((key) => data[key].sampleType);

  if (bioBankIds.length < 100) {
    console.warn("Not enough bioBankIds available for the matrix.");
  }

  for (let row = 0; row < rows.length; row++) {
    for (let col = 1; col <= cols; col++) {
      const labelName = `label_P${rows[row]}${col}`;
      const labelElement = document.getElementById(labelName);
      const index = getColumnMajorIndex(row, col, rows.length);

      if (labelElement) {
        if (bioBankIds[index] !== "") {
          labelElement.innerHTML = `${bioBankIds[index] || ""}<br>${sample[index] || ""}`;
          labelElement.style.fontWeight = "bold";
        } else if (bioBankIds[index] === "") {
          labelElement.innerHTML = `${"-"}<br>${"-"}`;
        }

        const newLabelElement = labelElement.cloneNode(true);
        labelElement.parentNode.replaceChild(newLabelElement, labelElement);

        if (sts[index] === "o") {
          newLabelElement.style.background = "rgb(129, 129, 192)";
          const matchedData = [];
          newLabelElement.addEventListener("click", async function () {
            const bioBankId = bioBankIds[index];
            const sampleType = sample[index];

            const dbRef = db.ref(`sef/${bioBankId}`);
            const snapshot = await dbRef.get();

            if (!snapshot.exists()) {
              console.log("No data found for bioBankId:", bioBankId);
              return;
            }

            const dbData = snapshot.val();

            Object.keys(dbData).forEach((seqNum) => {
              const seqData = dbData[seqNum];

              const latestTimestamp = Math.max(...Object.keys(seqData));

              const timestampData = seqData[latestTimestamp];

              if ((sampleType === "PC" || sampleType === "PC") && timestampData.ie.pc) {
                const pc = timestampData.ie.pc;
                const boxName = pc.split("/")[0];
                const pcIndex1 = pc.split("/")[1];

                if (pcIndex1 && pcIndex1.includes(getSeatLabel(index))) {
                  matchedData.push({
                    mode: "SearchView",
                    bioBankId,
                    seq: seqNum,
                    timestamp: latestTimestamp,
                  });
                }
              }
            });

            if (matchedData.length > 0) {
              matchedData.forEach((item) => {
                pages_display(item.mode, item.bioBankId, item.seq, item.timestamp);
              });
            } else {
              console.log("No match found for:", labelName);
            }
          });
        }

        if (sts[index] === "s") {
          newLabelElement.style.background = "rgb(180, 180, 180)";
          const matchedData = [];
          newLabelElement.addEventListener("click", async function () {
            const bioBankId = bioBankIds[index];
            const sampleType = sample[index];

            localStorage.setItem("sharedbioid", bioBankId);

            const dbRef = db.ref(`sef/${bioBankId}`);
            const snapshot = await dbRef.get();

            if (!snapshot.exists()) {
              console.log("No data found for bioBankId:", bioBankId);
              return;
            }

            const dbData = snapshot.val();

            Object.keys(dbData).forEach((seqNum) => {
              const seqData = dbData[seqNum];

              Object.keys(seqData).forEach((timestamp) => {
                const timestampData = seqData[timestamp];

                if ((sampleType === "PC" || sampleType === "PC") && timestampData.ie.pc) {
                  const pc = timestampData.ie.pc;
                  const boxName = pc.split("/")[0];
                  const pcIndex1 = pc.split("/")[1];

                  if (pcIndex1 && pcIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp,
                    });
                  }
                }
              });
            });

            if (matchedData.length > 0) {
              matchedData.forEach((item) => {
                shared_pages_display(item.mode, item.bioBankId, item.seq, item.boxName, item.timestamp);
              });
            } else {
              console.log("No match found for:", labelName);
            }
          });
        }

        if (sts[index] === "ps") {
          newLabelElement.style.background = "rgb(193, 154, 107)";
          const matchedData = [];
          newLabelElement.addEventListener("click", async function () {
            const bioBankId = bioBankIds[index];
            const sampleType = sample[index];

            localStorage.setItem("sharedbioid", bioBankId);

            const dbRef = db.ref(`sef/${bioBankId}`);
            const snapshot = await dbRef.get();

            if (!snapshot.exists()) {
              console.log("No data found for bioBankId:", bioBankId);
              return;
            }

            const dbData = snapshot.val();

            Object.keys(dbData).forEach((seqNum) => {
              const seqData = dbData[seqNum];

              Object.keys(seqData).forEach((timestamp) => {
                const timestampData = seqData[timestamp];

                if ((sampleType === "PC" || sampleType === "PC") && timestampData.ie.pc) {
                  const pc = timestampData.ie.pc;
                  const boxName = pc.split("/")[0];
                  const pcIndex1 = pc.split("/")[1];

                  if (pcIndex1 && pcIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp,
                    });
                  }
                }
              });
            });

            if (matchedData.length > 0) {
              matchedData.forEach((item) => {
                shared_pages_display(item.mode, item.bioBankId, item.seq, item.boxName, item.timestamp);
              });
            } else {
              console.log("No match found for:", labelName);
            }
          });
        }

        if (sts[index] === "e") {
          newLabelElement.style.background = "rgb(143, 218, 187)";

          newLabelElement.addEventListener("click", function () {
            localStorage.removeItem("MRN");
            openModal();
          });
        }
      }
    }
  }
}

function prev4Box() {
  if (currentPCBoxIndex > 0) {
    loadPCBox();
    currentPCBoxIndex--;
    populatePCDataForCurrentBox();
  }
}

function next4Box() {
  if (currentPCBoxIndex < PCboxKeys.length - 1) {
    loadPCBox();
    currentPCBoxIndex++;
    populatePCDataForCurrentBox();
  }
}

function loadPCBox() {
  event.preventDefault();

  const container = document.getElementById("Primary-box-container");
  var loadprogress = document.getElementById("Ploadprogress");
  loadprogress.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Loading...
      `;
  loadprogress.style.display = "block";

  container.style.display = "none";

  setTimeout(() => {
    loadprogress.innerHTML = "";
    loadprogress.style.display = "none";

    container.style.display = "block";
    populatePCDataForCurrentBox();
  }, 1000);
}

function populatePCDataForCurrentBox() {
  const boxVal = PCboxKeys[currentPCBoxIndex];

  db.ref("bn/" + boxVal)
    .once("value")
    .then((snapshot) => {
      if (snapshot.exists()) {
        const boxName = snapshot.val();

        document.getElementById("pcBox_id").textContent = boxName;
      } else {
        console.log("No box found with ID " + boxVal);
      }
    })
    .catch((error) => {
      console.error("Error fetching box name for ID " + boxVal + ": ", error);
    });
  db.ref(`pcb/${boxVal}/`)
    .once("value")
    .then((snapshot) => {
      const data = snapshot.val();
      if (data) {
        populatePCBLabels(data, boxVal, "call from populateBBDataForCurrentBox");
      }
    })
    .catch((error) => {
      console.error("Error fetching data from Firebase:", error);
    });
}

function test4() {
  populatePCBData();
}

function openModal() {
  const path = "bb/";
  const path1 = "sb/";
  const path2 = "rlt/";
  const path3 = "pcb/";
  let promise = [];
  let promises = [];
  const promise1 = db
    .ref("bb/")
    .once("value")
    .then((snapshot) => {
      const boxes = snapshot.val();
      if (boxes) {
        boxKeys = Object.keys(boxes);

        const bloodB = boxKeys.findIndex((boxKey) => boxes[boxKey].bxsts === "AC");
        boxVal1 = boxKeys[bloodB];

        if (boxVal1 === undefined) {
          return false;
        } else {
          return true;
        }
      }
    });

  const promise2 = db
    .ref(path1)
    .once("value")
    .then((snapshot) => {
      const boxes = snapshot.val();
      if (boxes) {
        boxKeys = Object.keys(boxes);
        const tissueB = boxKeys.findIndex((boxKey) => boxes[boxKey].bxsts === "AC");
        boxVal2 = boxKeys[tissueB];

        if (boxVal2 === undefined) {
          return false;
        } else {
          return true;
        }
      }
    });
  const promise3 = db
    .ref(path2)
    .once("value")
    .then((snapshot) => {
      const boxes = snapshot.val();
      if (boxes) {
        boxKeys = Object.keys(boxes); // Populate boxKeys here
        const rltB = boxKeys.findIndex((boxKey) => boxes[boxKey].bxsts === "AC");
        boxVal3 = boxKeys[rltB];

        if (boxVal3 === undefined) {
          return false;
        } else {
          return true;
        }
      }
    });
  const promise4 = db
    .ref(path3)
    .once("value")
    .then((snapshot) => {
      const boxes = snapshot.val();
      if (boxes) {
        boxKeys = Object.keys(boxes); // Populate boxKeys here
        const primaryB = boxKeys.findIndex((boxKey) => boxes[boxKey].bxsts === "AC");
        boxVal4 = boxKeys[primaryB];

        if (boxVal4 === undefined) {
          return false;
        } else {
          return true;
        }
      }
    });
  promises.push(promise1, promise2, promise3, promise4);
  Promise.all([promise1, promise2, promise3, promise4]).then((results) => {
    console.log("promise1 result:", results[0]);
    console.log("promise2 result:", results[1]);
    console.log("promise3 result:", results[2]);
    console.log("promise4 result:", results[3]);
    const allTrue = results.every((result) => result === true);
    if (allTrue) {
      console.log("All promises are true");
      $("#exampleModalCenter").modal("show");
    } else {
      console.log("Not all promises are true");
      alert(`Please add boxes before adding samples`);
    }
  });
}

function AppendRLTBox(boxName, newBoxId) {
  const newBoxData = {};
  for (let i = 0; i < 101; i++) {
    if (i < 100) {
      newBoxData[i] = {
        bioBankId: "",
        sampleType: "",
        status: "e",
      };
    } else {
      newBoxData["bxsts"] = "AC";
    }
  }

  db.ref("rlt/")
    .once("value")
    .then((snapshot) => {
      const existingBoxes = snapshot.val();
      if (existingBoxes) {
        for (const existingBox in existingBoxes) {
          if (existingBox !== newBoxId) {
            const oldBoxData = existingBoxes[existingBox];
            const updatedOldBoxData = {};

            for (let i = 0; i < 100; i++) {
              updatedOldBoxData[i] = oldBoxData[i] || {
                bioBankId: "",
                sampleType: "",
                status: "IAC", // Mark old boxes as Inactive (IAC)
              };
            }

            updatedOldBoxData["bxsts"] = "IAC";
            db.ref("rlt/" + existingBox + "/")
              .set(updatedOldBoxData)
              .catch((error) => {
                console.error("Error updating old box status: ", error);
              });
          }
        }
      }
      db.ref("rlt/" + newBoxId + "/")
        .set(newBoxData)
        .then(() => {
          console.log("New box added successfully with ID: " + newBoxId);
          window.location.reload();
        })
        .catch((error) => {
          console.error("Error saving new box to Firebase: ", error);
        });
    })
    .catch((error) => {
      console.error("Error fetching existing boxes: ", error);
    });
  db.ref("bn/" + newBoxId)
    .set(boxName)
    .then(() => {
      console.log("Box name added successfully to the 'bn' node.");
      fetchBnData();
    })
    .catch((error) => {
      console.error("Error saving box name to 'bn' node: ", error);
    });
}

function AppendPCBox(boxName, newBoxId) {
  const newBoxData = {};
  for (let i = 0; i < 101; i++) {
    if (i < 100) {
      newBoxData[i] = {
        bioBankId: "",
        sampleType: "",
        status: "e",
      };
    } else {
      newBoxData["bxsts"] = "AC"; // New box status is Active (AC)
    }
  }

  db.ref("pcb/")
    .once("value")
    .then((snapshot) => {
      const existingBoxes = snapshot.val();
      if (existingBoxes) {
        for (const existingBox in existingBoxes) {
          if (existingBox !== newBoxId) {
            const oldBoxData = existingBoxes[existingBox];
            const updatedOldBoxData = {};

            for (let i = 0; i < 100; i++) {
              updatedOldBoxData[i] = oldBoxData[i] || {
                bioBankId: "",
                sampleType: "",
                status: "IAC", // Mark old boxes as Inactive (IAC)
              };
            }

            updatedOldBoxData["bxsts"] = "IAC"; // Mark the old box itself as Inactive (IAC)
            db.ref("pcb/" + existingBox + "/")
              .set(updatedOldBoxData)
              .catch((error) => {
                console.error("Error updating old box status: ", error);
              });
          }
        }
      }
      db.ref("pcb/" + newBoxId + "/")
        .set(newBoxData)
        .then(() => {
          console.log("New box added successfully with ID: " + newBoxId);
          window.location.reload();
        })
        .catch((error) => {
          console.error("Error saving new box to Firebase: ", error);
        });
    })
    .catch((error) => {
      console.error("Error fetching existing boxes: ", error);
    });
  db.ref("bn/" + newBoxId)
    .set(boxName)
    .then(() => {
      console.log("Box name added successfully to the 'bn' node.");
      fetchBnData();
    })
    .catch((error) => {
      console.error("Error saving box name to 'bn' node: ", error);
    });
}

function AppendBloodBox(boxName, newBoxId) {
  const newBoxData = {};
  for (let i = 0; i < 101; i++) {
    if (i < 100) {
      newBoxData[i] = {
        bioBankId: "",
        sampleType: "",
        status: "e",
      };
    } else {
      newBoxData["bxsts"] = "AC"; // New box status is Active (AC)
    }
  }

  db.ref("bb/")
    .once("value")
    .then((snapshot) => {
      const existingBoxes = snapshot.val();
      if (existingBoxes) {
        for (const existingBox in existingBoxes) {
          if (existingBox !== newBoxId) {
            const oldBoxData = existingBoxes[existingBox];
            const updatedOldBoxData = {};

            for (let i = 0; i < 100; i++) {
              updatedOldBoxData[i] = oldBoxData[i] || {
                bioBankId: "",
                sampleType: "",
                status: "IAC", // Mark old boxes as Inactive (IAC)
              };
            }

            updatedOldBoxData["bxsts"] = "IAC"; // Mark the old box itself as Inactive (IAC)
            db.ref("bb/" + existingBox + "/")
              .set(updatedOldBoxData)
              .catch((error) => {
                console.error("Error updating old box status: ", error);
              });
          }
        }
      }
      db.ref("bb/" + newBoxId + "/")
        .set(newBoxData)
        .then(() => {
          console.log("New box added successfully with ID: " + newBoxId);
          window.location.reload();
        })
        .catch((error) => {
          console.error("Error saving new box to Firebase: ", error);
        });
    })
    .catch((error) => {
      console.error("Error fetching existing boxes: ", error);
    });
  db.ref("bn/" + newBoxId)
    .set(boxName)
    .then(() => {
      console.log("Box name added successfully to the 'bn' node.");
      fetchBnData();
    })
    .catch((error) => {
      console.error("Error saving box name to 'bn' node: ", error);
    });
}

function AppendSpecimenBox(boxName, newBoxId) {
  const newBoxData = {};

  for (let i = 0; i < 101; i++) {
    if (i < 100) {
      newBoxData[i] = {
        bioBankId: "",
        sampleType: "",
        status: "e",
      };
    } else {
      newBoxData["bxsts"] = "AC";
    }
  }
  db.ref("sb/")
    .once("value")
    .then((snapshot) => {
      const existingBoxes = snapshot.val();
      if (existingBoxes) {
        for (const existingBox in existingBoxes) {
          if (existingBox !== newBoxId) {
            const oldBoxData = existingBoxes[existingBox];
            const updatedOldBoxData = {};

            for (let i = 0; i < 100; i++) {
              updatedOldBoxData[i] = oldBoxData[i] || {
                bioBankId: "",
                sampleType: "",
                status: "IAC", // Mark old boxes as Inactive (IAC)
              };
            }

            updatedOldBoxData["bxsts"] = "IAC"; // Mark the old box itself as Inactive (IAC)
            db.ref("sb/" + existingBox + "/")
              .set(updatedOldBoxData)
              .catch((error) => {
                console.error("Error updating old box status: ", error);
              });
          }
        }
      }
      db.ref("sb/" + newBoxId + "/")
        .set(newBoxData)
        .then(() => {
          console.log("New box added successfully to Firebase.");
          window.location.reload();
        })
        .catch((error) => {
          console.error("Error saving new box to Firebase: ", error);
        });
    })
    .catch((error) => {
      console.error("Error fetching existing boxes: ", error);
    });

  db.ref("bn/" + newBoxId)
    .set(boxName)
    .then(() => {
      console.log("Box name added successfully to the 'bn' node.");
      fetchBnData();
    })
    .catch((error) => {
      console.error("Error saving box name to 'bn' node: ", error);
    });
}

let user = sessionStorage.getItem("userName");

function validateAndCollectData() {
  Promise.all([
    Promise.resolve(validateForm1()), // Wraps the synchronous result in a resolved promise
    Promise.resolve(validateForm2()),
    Promise.resolve(validateForm3()),
  ])
    .then((results) => {
      const [form1Data, form2Data, form3Data] = results;

      if (form1Data && form2Data && form3Data) {
        const data = {
          ie: form1Data.ie,
          md: form2Data.md,
          brf: form3Data.brf,
        };

        const updateMode = new URLSearchParams(window.location.search).get("update");

        let mode = localStorage.getItem("mode");

        let bS = localStorage.getItem("bloodVStatus");
        let tS = localStorage.getItem("specimenVStatus");
        let oS = localStorage.getItem("otherVStatus");
        let rltS = localStorage.getItem("rltVStatus");
        let pcV = localStorage.getItem("pcVVStatus");

        if (mode !== "SearchEdit" && mode !== "PendingEdit") {
          if (form1Data.ie.bpg) {
            updateBB(form1Data.ie.bpg, "Plasma");
          }
          if (form1Data.ie.bsg) {
            updateBB(form1Data.ie.bsg, "Serum");
          }
          if (form1Data.ie.bbcg) {
            updateBB(form1Data.ie.bbcg, "Buffy Coat");
          }
          if (form1Data.ie.osg) {
            updateBB(form1Data.ie.osg, "Other");
          }
          if (form1Data.ie.rlt) {
            updateRLT(form1Data.ie.rlt, "form entry");
          }
          if (form1Data.ie.pc) {
            updatePC(form1Data.ie.pc, "PC");
          }

          if (form1Data.ie.ftg !== "" && form1Data.ie.ftg !== null) {
            updateSB(form1Data.ie.ftg, "FT-1");
          }
          if (form1Data.ie.fng !== "" && form1Data.ie.fng !== null) {
            updateSB(form1Data.ie.fng, "FN-1");
          }
        } else if (mode === "SearchEdit" || mode === "PendingEdit") {
          if (form1Data.ie.bpg && bS === "false" && form1Data.ie.bs === "true") {
            updateBB(form1Data.ie.bpg, "Plasma");
          }
          if (form1Data.ie.bsg && bS === "false" && form1Data.ie.bs === "true") {
            updateBB(form1Data.ie.bsg, "Serum");
          }
          if (form1Data.ie.bbcg && bS === "false" && form1Data.ie.bs === "true") {
            updateBB(form1Data.ie.bbcg, "Buffy Coat");
          }
          if (form1Data.ie.osg && oS === "false" && form1Data.ie.osmp === "true") {
            updateBB(form1Data.ie.osg, "Other");
          }
          if (form1Data.ie.rlt && rltS === "false" && form1Data.ie.rltS === "true") {
            updateRLT(form1Data.ie.rlt, "Search update RLT");
          }
          if (form1Data.ie.pc && (pcV === "No" || pcV === "Inprogress") && form1Data.ie.pcS === "true" && form1Data.ie.pssvl === "Yes") {
            updatePC(form1Data.ie.pc, "PC");
          }

          if (form1Data.ie.ftg !== "" && form1Data.ie.ftg !== null && tS === "false" && form1Data.ie.ss === "true") {
            updateSB(form1Data.ie.ftg, "FT-1");
          }
          if (form1Data.ie.fng !== "" && form1Data.ie.fng !== null && tS === "false" && form1Data.ie.ss === "true") {
            updateSB(form1Data.ie.fng, "FN-1");
          }
        }

        patients();

        if (updateMode === "true") {
          console.log("Updating data to Firebase:", data);
          updateToFirebase(data);
        } else {
          console.log("Saving data to Firebase:", data);
          saveToFirebase(data);
        }
        return data;
      }
    })
    .catch((error) => {
      console.error("Error during form validation:", error);
    });
}
function getTimeValidation(id) {
  const time = document.getElementById(id).value;
  return time === "00:00" ? true : false;
}

function dateValidation(cancer_type) {
  // Helper Function
  function getDateAndTimeIds(cancer_type) {
    const suffixMap = {
      brst: "",
      ceix: "_ceix",
      endm: "_endm",
      ovry: "_ovry",
    };

    const suffix = suffixMap[cancer_type];

    if (suffix === undefined) return null;

    return [
      `sampleReceivedDate${suffix}`,
      `sampleReceivedTime${suffix}`,
      `sampleProcessedDate${suffix}`,
      `sampleProcessedTime${suffix}`,

      `bloodSampleReceivedDate${suffix}`,
      `bloodSampleReceivedTime${suffix}`,
      `bloodSampleProcessedDate${suffix}`,
      `bloodSampleProcessedTime${suffix}`,

      `SpecimenSampleReceivedDate${suffix}`,
      `SpecimenSampleReceivedTime${suffix}`,
      `SpecimenSampleProcessedDate${suffix}`,
      `SpecimenSampleProcessedTime${suffix}`,

      `OtherSampleReceivedDate${suffix}`,
      `OtherSampleReceivedTime${suffix}`,
      `OtherSampleProcessedDate${suffix}`,
      `OtherSampleProcessedTime${suffix}`,

      `RLTSampleReceivedDate${suffix}`,
      `RLTSampleReceivedTime${suffix}`,
      `RLTSampleProcessedDate${suffix}`,
      `RLTSampleProcessedTime${suffix}`,

      `PCSampleReceivedDate${suffix}`,
      `PCSampleReceivedTime${suffix}`,
      `PCSampleProcessedDate${suffix}`,
      `PCSampleProcessedTime${suffix}`,
    ];
  }
  const getDateAndTime = (dateId, timeId) => {
    const dateValue = document.getElementById(dateId).value;
    const timeValue = document.getElementById(timeId).value;
    if (dateValue && timeValue) {
      const dateTimeString = `${dateValue}T${timeValue}`;
      const dateTime = new Date(dateTimeString);

      if (!isNaN(dateTime.getTime())) {
        return dateTime.getTime() / 1000;
      }
    }
    return null; // If invalid or empty, return null
  };
  const ids = getDateAndTimeIds(cancer_type);

  if (!ids) {
    alert("Invalid cancer type");
    return false;
  }

  const [
    sampleReceivedDate,
    sampleReceivedTime,
    sampleProcessedDate,
    sampleProcessedTime,

    bloodSampleReceivedDate,
    bloodSampleReceivedTime,
    bloodSampleProcessedDate,
    bloodSampleProcessedTime,

    SpecimenSampleReceivedDate,
    SpecimenSampleReceivedTime,
    SpecimenSampleProcessedDate,
    SpecimenSampleProcessedTime,

    OtherSampleReceivedDate,
    OtherSampleReceivedTime,
    OtherSampleProcessedDate,
    OtherSampleProcessedTime,

    RLTSampleReceivedDate,
    RLTSampleReceivedTime,
    RLTSampleProcessedDate,
    RLTSampleProcessedTime,

    PCSampleReceivedDate,
    PCSampleReceivedTime,
    PCSampleProcessedDate,
    PCSampleProcessedTime,
  ] = ids;

  // Time Validation
  const timeChecks = [
    [sampleReceivedTime, "Sample Received Time"],
    [sampleProcessedTime, "Sample Processed Time"],
    [bloodSampleReceivedTime, "Blood Sample Received Time"],
    [bloodSampleProcessedTime, "Blood Sample Processed Time"],
    [SpecimenSampleReceivedTime, "Specimen Sample Received Time"],
    [SpecimenSampleProcessedTime, "Specimen Sample Processed Time"],
    [OtherSampleReceivedTime, "Other Sample Received Time"],
    [OtherSampleProcessedTime, "Other Sample Processed Time"],
    [RLTSampleReceivedTime, "RLT Sample Received Time"],
    [RLTSampleProcessedTime, "RLT Sample Processed Time"],
    [PCSampleReceivedTime, "PC Sample Received Time"],
    [PCSampleProcessedTime, "PC Sample Processed Time"],
  ];

  for (let [id, label] of timeChecks) {
    if (getTimeValidation(id)) {
      alert(`${label} cannot be 00:00`);
      return false;
    }
  }

  // Timestamp Validation
  const dateChecks = [
    [getDateAndTime(sampleReceivedDate, sampleReceivedTime), getDateAndTime(sampleProcessedDate, sampleProcessedTime), "Sample"],
    [getDateAndTime(bloodSampleReceivedDate, bloodSampleReceivedTime), getDateAndTime(bloodSampleProcessedDate, bloodSampleProcessedTime), "Blood Sample"],
    [getDateAndTime(SpecimenSampleReceivedDate, SpecimenSampleReceivedTime), getDateAndTime(SpecimenSampleProcessedDate, SpecimenSampleProcessedTime), "Specimen Sample"],
    [getDateAndTime(OtherSampleReceivedDate, OtherSampleReceivedTime), getDateAndTime(OtherSampleProcessedDate, OtherSampleProcessedTime), "Other Sample"],
    [getDateAndTime(RLTSampleReceivedDate, RLTSampleReceivedTime), getDateAndTime(RLTSampleProcessedDate, RLTSampleProcessedTime), "RLT Sample"],
    [getDateAndTime(PCSampleReceivedDate, PCSampleReceivedTime), getDateAndTime(PCSampleProcessedDate, PCSampleProcessedTime), "PC Sample"],
  ];

  for (let [received, processed, label] of dateChecks) {
    if (received && processed && received > processed) {
      alert(`${label} Received Date and Time should be before ${label} Processed Date and Time`);
      return false;
    }
  }

  return true;
}

function validateForm1() {
  // Helper Function
  const getDateAndTime = (dateId, timeId) => {
    const dateValue = document.getElementById(dateId).value;
    const timeValue = document.getElementById(timeId).value;

    if (dateValue && timeValue) {
      const dateTimeString = `${dateValue}T${timeValue}`;
      const dateTime = new Date(dateTimeString);

      if (!isNaN(dateTime.getTime())) {
        return dateTime.getTime() / 1000;
      }
    }
    return null; // If invalid or empty, return null
  };
  const gridData = (gridValue) => {
    return new Promise((resolve) => {
      const gridElement = document.getElementById(gridValue);
      const gridVal = gridElement ? gridElement.value : null;
      if (gridVal) {
        let parts = gridVal.split("/");
        let boxName = parts[0];
        db.ref(`bn/`)
          .once("value")
          .then((snapshot) => {
            let boxIDs = snapshot.val();
            const boxEntry = Object.entries(boxIDs).find(([id, name]) => name === boxName);
            if (boxEntry) {
              const [id] = boxEntry;
              parts[0] = id;
              const updatedgridNo = parts.join("/");
              resolve(updatedgridNo);
            } else {
              resolve(gridVal); // If no match found, resolve with original value
            }
          });
      } else {
        resolve(null); // If invalid or empty, resolve with null
      }
    });
  };

  const cancer_type = document.getElementById("cancer_type").value;

  // Set required fields based on cancer type
  let requiredFields = null;
  if (cancer_type === "brst") {
    requiredFields = [
      { field: document.getElementById("mrnNo"), name: "MRN Number" },
      { field: document.getElementById("cancer_type"), name: "Cancer Type" },
      { field: document.getElementById("bioBankId"), name: "Bio Bank ID" },
      { field: document.getElementById("patAge"), name: "Age" },
      { field: document.querySelector('input[name="customRadio"]:checked'), name: "Gender" },
      { field: document.querySelector('input[name="customProcedure"]:checked'), name: "Procedure Types" },
      { field: document.querySelector('input[name="MetastasisSample"]:checked'), name: "Metastasis Sample" },
      { field: document.querySelector('input[name="specimenSample"]:checked'), name: "Specimen Sample" },
      { field: document.querySelector('input[name="bloodSample"]:checked'), name: "Blood Sample" },
      { field: document.querySelector('input[name="otherSample"]:checked'), name: "Other Sample" },
      { field: document.querySelector('input[name="rltSample"]:checked'), name: "RLT Sample" },
      { field: document.querySelector('input[name="pcbSample"]:checked'), name: "PC Sample" },
      { field: document.querySelector('input[name="processedRadio"]:checked'), name: "All samples Received Together?" },
    ];
  } else if (cancer_type === "ceix") {
    requiredFields = [
      { field: document.getElementById("mrnNo"), name: "MRN Number" },
      { field: document.getElementById("bioBankId"), name: "Bio Bank ID" },
      { field: document.getElementById("cancer_type"), name: "Cancer Type" },
      { field: document.getElementById("patAge_ceix"), name: "Age" },
      { field: document.querySelector('input[name="customRadio_ceix"]:checked'), name: "Gender" },
      { field: document.querySelector('input[name="customProcedure_ceix"]:checked'), name: "Procedure Types" },
      { field: document.querySelector('input[name="MetastasisSample_ceix"]:checked'), name: "Metastasis Sample" },
      { field: document.querySelector('input[name="bloodsample_ceix"]:checked'), name: "Blood Sample" },
      { field: document.querySelector('input[name="specimenSample_ceix"]:checked'), name: "Specimen Sample" },
      { field: document.querySelector('input[name="otherSample_ceix"]:checked'), name: "Other Sample" },
      { field: document.querySelector('input[name="rltSample_ceix"]:checked'), name: "RLT Sample" },
      { field: document.querySelector('input[name="pcbSample_ceix"]:checked'), name: "PC Sample" },
      { field: document.querySelector('input[name="processedRadio_ceix"]:checked'), name: "All samples Received Together?" },
    ];
  } else if (cancer_type === "endm") {
    requiredFields = [
      { field: document.getElementById("mrnNo"), name: "MRN Number" },
      { field: document.getElementById("bioBankId"), name: "Bio Bank ID" },
      { field: document.getElementById("cancer_type"), name: "Cancer Type" },
      { field: document.getElementById("patAge_endm"), name: "Age" },
      { field: document.querySelector('input[name="customRadio_endm"]:checked'), name: "Gender" },
      { field: document.querySelector('input[name="customProcedure_endm"]:checked'), name: "Procedure Types" },
      { field: document.querySelector('input[name="MetastasisSample_endm"]:checked'), name: "Metastasis Sample" },
      { field: document.querySelector('input[name="bloodSample_endm"]:checked'), name: "Blood Sample" },
      { field: document.querySelector('input[name="specimenSample_endm"]:checked'), name: "Specimen Sample" },
      { field: document.querySelector('input[name="otherSample_endm"]:checked'), name: "Other Sample" },
      { field: document.querySelector('input[name="rltSample_endm"]:checked'), name: "RLT Sample" },
      { field: document.querySelector('input[name="pcbSample_endm"]:checked'), name: "PC Sample" },
      { field: document.querySelector('input[name="processedRadio_endm"]:checked'), name: "All samples Received Together?" },
    ];
  } else if (cancer_type === "ovry") {
    requiredFields = [
      { field: document.getElementById("mrnNo"), name: "MRN Number" },
      { field: document.getElementById("bioBankId"), name: "Bio Bank ID" },
      { field: document.getElementById("cancer_type"), name: "Cancer Type" },
      { field: document.getElementById("patAge_ovry"), name: "Age" },
      { field: document.querySelector('input[name="customRadio_ovry"]:checked'), name: "Gender" },
      { field: document.querySelector('input[name="customProcedure_ovry"]:checked'), name: "Procedure Types" },
      { field: document.querySelector('input[name="MetastasisSample_ovry"]:checked'), name: "Metastasis Sample" },
      { field: document.querySelector('input[name="bloodSample_ovry"]:checked'), name: "Blood Sample" },
      { field: document.querySelector('input[name="specimenSample_ovry"]:checked'), name: "Specimen Sample" },
      { field: document.querySelector('input[name="otherSample_ovry"]:checked'), name: "Other Sample" },
      { field: document.querySelector('input[name="rltSample_ovry"]:checked'), name: "RLT Sample" },
      { field: document.querySelector('input[name="pcbSample_ovry"]:checked'), name: "PC Sample" },
      { field: document.querySelector('input[name="processedRadio_ovry"]:checked'), name: "All samples Received Together?" },
    ];
  }

  let allFilled = true;
  let biochar = true;
  const emptyFields = [];
  // Check if the field are filled
  requiredFields.forEach((item) => {
    if (!item.field || (item.field.type === "radio" && !item.field.checked) || (item.field.type === "number" && item.field.value === "")) {
      allFilled = false;
      emptyFields.push(item.name);
    }
  });
  // Date Validation
  if (!dateValidation(cancer_type)) return;

  // Validate BioBank
  const bioBankIdField = document.getElementById("bioBankId");
  const invalidCharacter = "/";
  if (bioBankIdField.value.includes(invalidCharacter)) {
    biochar = false;
    emptyFields.push('Bio Bank ID should not contain special character "/"');
  }

  const mode = localStorage.getItem("mode");
  if (mode === "SearchView" || mode === "pendingView") {
    if (!allFilled) {
      console.log("Please fill in the following required fields:", emptyFields.join(", "));
    }
  } else if (!allFilled) {
    alert("Please enter all the required fields");
    return;
  } else if (!biochar) {
    alert(`The Biobank Id should not contain "/"`);
    return;
  }

  if (cancer_type === "brst") {
    let proType = "";
    const procType = document.querySelector('input[name="customProcedure"]:checked').value;
    const metaType = document.querySelector('input[name="MetastasisSample"]:checked').value;

    if (procType === "b" && metaType === "false") {
      proType = "Bx";
    } else if (procType === "b" && metaType === "true") {
      proType = "MBx";
    } else if (procType === "r" && metaType === "false") {
      proType = "Sx";
    } else if (procType === "r" && metaType === "true") {
      proType = "MSx";
    }

    return Promise.all([
      gridData("PlasmagridNo"),
      gridData("SerumgridNo"),
      gridData("bufferCoatgridNo"),
      gridData("OSgridNo"),
      gridData("ftgrid"),
      gridData("fngrid"),
      gridData("rltSgridNo"),
      gridData("pcSgridNo"),
      getDateAndTime("sampleReceivedDate", "sampleReceivedTime"),
      getDateAndTime("sampleProcessedDate", "sampleProcessedTime"),
      getDateAndTime("bloodSampleReceivedDate", "bloodSampleReceivedTime"),
      getDateAndTime("bloodSampleProcessedDate", "bloodSampleProcessedTime"),
      getDateAndTime("SpecimenSampleReceivedDate", "SpecimenSampleReceivedTime"),
      getDateAndTime("SpecimenSampleProcessedDate", "SpecimenSampleProcessedTime"),
      getDateAndTime("OtherSampleReceivedDate", "OtherSampleReceivedTime"),
      getDateAndTime("OtherSampleProcessedDate", "OtherSampleProcessedTime"),
      getDateAndTime("RLTSampleReceivedDate", "RLTSampleReceivedTime"),
      getDateAndTime("RLTSampleProcessedDate", "RLTSampleProcessedTime"),
      getDateAndTime("PCSampleReceivedDate", "PCSampleReceivedTime"),
      getDateAndTime("PCSampleProcessedDate", "PCSampleProcessedTime"),
    ]).then(
      ([
        plasmagrid,
        Serumgrid,
        buffyCoatgrid,
        otherSgrid,
        ftSgrid,
        fnSgrid,
        rltSgrid,
        pcSgrid,
        aRtimestamp,
        aPtimestamp,
        bRtimestamp,
        bPtimestamp,
        sRtimestamp,
        sPtimestamp,
        oRtimestamp,
        oPtimestamp,
        rRtimestamp,
        rPtimestamp,
        pRtimestamp,
        pPtimestamp,
      ]) => {
        const form1Data = {
          ie: {
            cnst: document.querySelector('input[name="customConsent"]:checked')?.value || "",
            ct: document.getElementById("cancer_type").value,
            ag: document.getElementById("patAge").value,
            sx: document.querySelector('input[name="customRadio"]:checked').value,
            tpr: document.querySelector('input[name="customProcedure"]:checked').value,
            dpr: document.getElementById("procedureDetail").value,
            srn: document.getElementById("surgeonName").value,
            mts: document.querySelector('input[name="MetastasisSample"]:checked').value,
            es: document.getElementById("eventSelection").value,
            mspt: proType,
            dm: document.querySelector('input[name="denovo"]:checked')?.value || "",
            ag_ms: document.getElementById("mpt_age").value || "",
            site: document.getElementById("mpt_site").value || "",
            rcpt: document.getElementById("mpt_rs").value || "",
            ss: document.querySelector('input[name="specimenSample"]:checked').value,
            nft: document.getElementById("ft_tubes").value,
            nfn: document.getElementById("fn_tubes").value,
            bs: document.querySelector('input[name="bloodSample"]:checked').value,
            bpg: plasmagrid,
            bsg: Serumgrid,
            bbcg: buffyCoatgrid,
            ftg: ftSgrid,
            fng: fnSgrid,
            osmp: document.querySelector('input[name="otherSample"]:checked').value,
            osg: otherSgrid,
            osdsc: document.getElementById("otSampleDesc").value,
            rltS: document.querySelector('input[name="rltSample"]:checked').value,
            rlt: rltSgrid,
            pcS: document.querySelector('input[name="pcbSample"]:checked').value,
            pssvl: document.querySelector('input[name="pcbV"]:checked')?.value || "",
            pc: pcSgrid,
            iss: document.querySelector('input[name="IschemicRadio"]:checked')?.value || "",
            nact: document.querySelector('input[name="NACT"]:checked')?.value || "",
            nactEff: document.getElementById("nactEff")?.value || "",
            nactdc: document.getElementById("NACT_cycle").value || "",
            nactdlc: document.getElementById("NACT_cycle_D").value || "",
            prb: document.getElementById("processedBy").value,
            scpt: document.querySelector('input[name="processedRadio"]:checked')?.value || "",
            srt: aRtimestamp, // These will now either be valid timestamps or null
            spt: aPtimestamp,
            brt: bRtimestamp,
            bpt: bPtimestamp,
            sprt: sRtimestamp,
            sppt: sPtimestamp,
            osrt: oRtimestamp,
            ospt: oPtimestamp,
            rsrt: rRtimestamp,
            rspt: rPtimestamp,
            psrt: pRtimestamp,
            pspt: pPtimestamp,
            bspb: document.getElementById("BprocessedBy").value,
            sspb: document.getElementById("SprocessedBy").value,
            ospb: document.getElementById("OprocessedBy").value,
            rltpb: document.getElementById("RLTprocessedBy").value,
            psspb: document.getElementById("PCprocessedBy").value,
            sef_ub: user,
          },
        };
        return form1Data;
      },
    );
  } else if (cancer_type === "ovry") {
    let proType = "";
    const procType = document.querySelector('input[name="customProcedure_ovry"]:checked').value;
    const metaType = document.querySelector('input[name="MetastasisSample_ovry"]:checked').value;

    if (procType === "b" && metaType === "false") {
      proType = "Bx";
    } else if (procType === "b" && metaType === "true") {
      proType = "MBx";
    } else if (procType === "r" && metaType === "false") {
      proType = "Sx";
    } else if (procType === "r" && metaType === "true") {
      proType = "MSx";
    }

    return Promise.all([
      gridData("PlasmagridNo_ovry"),
      gridData("SerumgridNo_ovry"),
      gridData("bufferCoatgridNo_ovry"),
      gridData("OSgridNo_ovry"),
      gridData("ftgrid_ovry"),
      gridData("fngrid_ovry"),
      gridData("rltSgridNo_ovry"),
      gridData("pcbSgridNo_ovry"),
      getDateAndTime("sampleReceivedDate_ovry", "sampleReceivedTime_ovry"),
      getDateAndTime("sampleProcessedDate_ovry", "sampleProcessedTime_ovry"),
      getDateAndTime("bloodSampleReceivedDate_ovry", "bloodSampleReceivedTime_ovry"),
      getDateAndTime("bloodSampleProcessedDate_ovry", "bloodSampleProcessedTime_ovry"),
      getDateAndTime("SpecimenSampleReceivedDate_ovry", "SpecimenSampleReceivedTime_ovry"),
      getDateAndTime("SpecimenSampleProcessedDate_ovry", "SpecimenSampleProcessedTime_ovry"),
      getDateAndTime("OtherSampleReceivedDate_ovry", "OtherSampleReceivedTime_ovry"),
      getDateAndTime("OtherSampleProcessedDate_ovry", "OtherSampleProcessedTime_ovry"),
      getDateAndTime("RLTSampleReceivedDate_ovry", "RLTSampleReceivedTime_ovry"),
      getDateAndTime("RLTSampleProcessedDate_ovry", "RLTSampleProcessedTime_ovry"),
      getDateAndTime("PCSampleReceivedDate_ovry", "PCSampleReceivedTime_ovry"),
      getDateAndTime("PCSampleProcessedDate_ovry", "PCSampleProcessedTime_ovry"),
    ]).then(
      ([
        plasmagrid,
        Serumgrid,
        buffyCoatgrid,
        otherSgrid,
        ftSgrid,
        fnSgrid,
        rltSgrid,
        pcSgrid,
        aRtimestamp,
        aPtimestamp,
        bRtimestamp,
        bPtimestamp,
        sRtimestamp,
        sPtimestamp,
        oRtimestamp,
        oPtimestamp,
        rRtimestamp,
        rPtimestamp,
        pRtimestamp,
        pPtimestamp,
      ]) => {
        const form1Data = {
          ie: {
            cnst: document.querySelector('input[name="customConsent"]:checked')?.value || "",
            ct: document.getElementById("cancer_type").value,
            ag: document.getElementById("patAge_ovry").value,
            sx: document.querySelector('input[name="customRadio_ovry"]:checked').value,
            tpr: document.querySelector('input[name="customProcedure_ovry"]:checked').value,
            dpr: document.getElementById("procedureDetail_ovry").value,
            srn: document.getElementById("surgeonName_ovry").value,
            mts: document.querySelector('input[name="MetastasisSample_ovry"]:checked').value,
            es: document.getElementById("eventSelection_ovry").value,
            mspt: proType,
            dm: document.querySelector('input[name="denovo_ovry"]:checked')?.value || "",
            ag_ms: document.getElementById("mpt_age_ovry").value || "",
            site: document.getElementById("mpt_site_ovry").value || "",
            ss: document.querySelector('input[name="specimenSample_ovry"]:checked').value,
            nft: document.getElementById("ft_tubes_ovry").value,
            ftg: ftSgrid,
            nfn: document.getElementById("fn_tubes_ovry").value,
            fng: fnSgrid,
            bs: document.querySelector('input[name="bloodSample_ovry"]:checked').value,
            bsg: Serumgrid,
            bpg: plasmagrid,
            bbcg: buffyCoatgrid,
            osmp: document.querySelector('input[name="otherSample_ovry"]:checked').value,
            osg: otherSgrid,
            osdsc: document.getElementById("otSampleDesc_ovry").value,
            rltS: document.querySelector('input[name="rltSample_ovry"]:checked').value,
            rlt: rltSgrid,
            pcS: document.querySelector('input[name="pcbSample_ovry"]:checked').value,
            pssvl: document.querySelector('input[name="pcbV_ovry"]:checked')?.value || "",
            pc: pcSgrid,
            iss: document.querySelector('input[name="IschemicRadio_ovry"]:checked')?.value || "",
            nact: document.querySelector('input[name="NACT_ovry"]:checked')?.value || "",
            crs: document.getElementById("nactCRSEff_ovry")?.value || "",
            nactdc: document.getElementById("NACT_cycle_ovry").value || "",
            nactdlc: document.getElementById("NACT_cycle_D_ovry").value || "",
            scpt: document.querySelector('input[name="processedRadio_ovry"]:checked')?.value || "",
            prb: document.getElementById("processedBy_ovry").value,
            srt: aRtimestamp, // These will now either be valid timestamps or null
            spt: aPtimestamp,
            bspb: document.getElementById("BprocessedBy_ovry").value,
            brt: bRtimestamp,
            bpt: bPtimestamp,
            sspb: document.getElementById("SprocessedBy_ovry").value,
            sprt: sRtimestamp,
            sppt: sPtimestamp,
            ospb: document.getElementById("OprocessedBy_ovry").value,
            osrt: oRtimestamp,
            ospt: oPtimestamp,
            rltpb: document.getElementById("RLTprocessedBy_ovry").value,
            rsrt: rRtimestamp,
            rspt: rPtimestamp,
            psspb: document.getElementById("PCprocessedBy_ovry").value,
            psrt: pRtimestamp,
            pspt: pPtimestamp,
            sef_ub: user,
          },
        };
        return form1Data;
      },
    );
  } else if (cancer_type === "ceix") {
    let proType = "";
    const procType = document.querySelector('input[name="customProcedure_ceix"]:checked').value;
    const metaType = document.querySelector('input[name="MetastasisSample_ceix"]:checked').value;

    if (procType === "b" && metaType === "false") {
      proType = "Bx";
    } else if (procType === "b" && metaType === "true") {
      proType = "MBx";
    } else if (procType === "r" && metaType === "false") {
      proType = "Sx";
    } else if (procType === "r" && metaType === "true") {
      proType = "MSx";
    }

    return Promise.all([
      gridData("PlasmagridNo_ceix"),
      gridData("SerumgridNo_ceix"),
      gridData("bufferCoatgridNo_ceix"),
      gridData("OSgridNo_ceix"),
      gridData("ftgrid_ceix"),
      gridData("fngrid_ceix"),
      gridData("rltSgridNo_ceix"),
      gridData("pcbSgridNo_ceix"),
      getDateAndTime("sampleReceivedDate_ceix", "sampleReceivedTime_ceix"),
      getDateAndTime("sampleProcessedDate_ceix", "sampleProcessedTime_ceix"),
      getDateAndTime("bloodSampleReceivedDate_ceix", "bloodSampleReceivedTime_ceix"),
      getDateAndTime("bloodSampleProcessedDate_ceix", "bloodSampleProcessedTime_ceix"),
      getDateAndTime("SpecimenSampleReceivedDate_ceix", "SpecimenSampleReceivedTime_ceix"),
      getDateAndTime("SpecimenSampleProcessedDate_ceix", "SpecimenSampleProcessedTime_ceix"),
      getDateAndTime("OtherSampleReceivedDate_ceix", "OtherSampleReceivedTime_ceix"),
      getDateAndTime("OtherSampleProcessedDate_ceix", "OtherSampleProcessedTime_ceix"),
      getDateAndTime("RLTSampleReceivedDate_ceix", "RLTSampleReceivedTime_ceix"),
      getDateAndTime("RLTSampleProcessedDate_ceix", "RLTSampleProcessedTime_ceix"),
      getDateAndTime("PCSampleReceivedDate_ceix", "PCSampleReceivedTime_ceix"),
      getDateAndTime("PCSampleProcessedDate_ceix", "PCSampleProcessedTime_ceix"),
    ]).then(
      ([
        plasmagrid,
        Serumgrid,
        buffyCoatgrid,
        otherSgrid,
        ftSgrid,
        fnSgrid,
        rltSgrid,
        pcSgrid,
        aRtimestamp,
        aPtimestamp,
        bRtimestamp,
        bPtimestamp,
        sRtimestamp,
        sPtimestamp,
        oRtimestamp,
        oPtimestamp,
        rRtimestamp,
        rPtimestamp,
        pRtimestamp,
        pPtimestamp,
      ]) => {
        const form1Data = {
          ie: {
            cnst: document.querySelector('input[name="customConsent"]:checked')?.value || "",
            ct: document.getElementById("cancer_type").value,
            ag: document.getElementById("patAge_ceix").value,
            sx: document.querySelector('input[name="customRadio_ceix"]:checked').value,
            tpr: document.querySelector('input[name="customProcedure_ceix"]:checked').value,
            dpr: document.getElementById("procedureDetail_ceix").value,
            srn: document.getElementById("surgeonName_ceix").value,
            mts: document.querySelector('input[name="MetastasisSample_ceix"]:checked').value,
            es: document.getElementById("eventSelection_ceix").value,
            mspt: proType,
            dm: document.querySelector('input[name="denovo_ceix"]:checked')?.value || "",
            ag_ms: document.getElementById("mpt_age_ceix").value || "",
            site: document.getElementById("mpt_site_ceix").value || "",
            hpvs: document.getElementById("mpt_hpvs_ceix").value || "",
            ss: document.querySelector('input[name="specimenSample_ceix"]:checked').value,
            nft: document.getElementById("ft_tubes_ceix").value,
            ftg: ftSgrid,
            nfn: document.getElementById("fn_tubes_ceix").value,
            fng: fnSgrid,
            bs: document.querySelector('input[name="bloodsample_ceix"]:checked').value,
            bsg: Serumgrid,
            bpg: plasmagrid,
            bbcg: buffyCoatgrid,
            osmp: document.querySelector('input[name="otherSample_ceix"]:checked').value,
            osg: otherSgrid,
            osdsc: document.getElementById("otSampleDesc_ceix").value,
            rltS: document.querySelector('input[name="rltSample_ceix"]:checked').value,
            rlt: rltSgrid,
            pcS: document.querySelector('input[name="pcbSample_ceix"]:checked').value,
            pssvl: document.querySelector('input[name="pcbV_ceix"]:checked')?.value || "",
            pc: pcSgrid,
            iss: document.querySelector('input[name="IschemicRadio_ceix"]:checked')?.value || "",
            nact: document.querySelector('input[name="NACT_ceix"]:checked')?.value || "",
            nactdc: document.getElementById("NACT_cycle_ceix").value || "",
            nactdlc: document.getElementById("NACT_cycle_D_ceix").value || "",
            nart: document.querySelector('input[name="NART_ceix"]:checked')?.value || "",
            nartc: document.getElementById("NART_cycle_ceix").value || "",
            nartdc: document.getElementById("NART_cycle_D_ceix").value || "",
            narttc: document.getElementById("NART_cycle_T_ceix").value || "",
            nartdcc: document.getElementById("NART_cycle_DC_ceix").value || "",
            scpt: document.querySelector('input[name="processedRadio_ceix"]:checked')?.value || "",
            prb: document.getElementById("processedBy_ceix").value,
            srt: aRtimestamp, // These will now either be valid timestamps or null
            spt: aPtimestamp,
            bspb: document.getElementById("BprocessedBy_ceix").value,
            brt: bRtimestamp,
            bpt: bPtimestamp,
            sspb: document.getElementById("SprocessedBy_ceix").value,
            sprt: sRtimestamp,
            sppt: sPtimestamp,
            ospb: document.getElementById("OprocessedBy_ceix").value,
            osrt: oRtimestamp,
            ospt: oPtimestamp,
            rltpb: document.getElementById("RLTprocessedBy_ceix").value,
            rsrt: rRtimestamp,
            rspt: rPtimestamp,
            psspb: document.getElementById("PCprocessedBy_ceix").value,
            psrt: pRtimestamp,
            pspt: pPtimestamp,
            sef_ub: user,
          },
        };
        return form1Data;
      },
    );
  } else if (cancer_type === "endm") {
    let proType = "";
    const procType = document.querySelector('input[name="customProcedure_endm"]:checked').value;
    const metaType = document.querySelector('input[name="MetastasisSample_endm"]:checked').value;

    if (procType === "b" && metaType === "false") {
      proType = "Bx";
    } else if (procType === "b" && metaType === "true") {
      proType = "MBx";
    } else if (procType === "r" && metaType === "false") {
      proType = "Sx";
    } else if (procType === "r" && metaType === "true") {
      proType = "MSx";
    }

    return Promise.all([
      gridData("PlasmagridNo_endm"),
      gridData("SerumgridNo_endm"),
      gridData("bufferCoatgridNo_endm"),
      gridData("OSgridNo_endm"),
      gridData("ftgrid_endm"),
      gridData("fngrid_endm"),
      gridData("rltSgridNo_endm"),
      gridData("pcSgridNo_endm"),
      getDateAndTime("sampleReceivedDate_endm", "sampleReceivedTime_endm"),
      getDateAndTime("sampleProcessedDate_endm", "sampleProcessedTime_endm"),
      getDateAndTime("bloodSampleReceivedDate_endm", "bloodSampleReceivedTime_endm"),
      getDateAndTime("bloodSampleProcessedDate_endm", "bloodSampleProcessedTime_endm"),
      getDateAndTime("SpecimenSampleReceivedDate_endm", "SpecimenSampleReceivedTime_endm"),
      getDateAndTime("SpecimenSampleProcessedDate_endm", "SpecimenSampleProcessedTime_endm"),
      getDateAndTime("OtherSampleReceivedDate_endm", "OtherSampleReceivedTime_endm"),
      getDateAndTime("OtherSampleProcessedDate_endm", "OtherSampleProcessedTime_endm"),
      getDateAndTime("RLTSampleReceivedDate_endm", "RLTSampleReceivedTime_endm"),
      getDateAndTime("RLTSampleProcessedDate_endm", "RLTSampleProcessedTime_endm"),
      getDateAndTime("PCSampleReceivedDate_endm", "PCSampleReceivedTime_endm"),
      getDateAndTime("PCSampleProcessedDate_endm", "PCSampleProcessedTime_endm"),
    ]).then(
      ([
        plasmagrid,
        Serumgrid,
        buffyCoatgrid,
        otherSgrid,
        ftSgrid,
        fnSgrid,
        rltSgrid,
        pcSgrid,
        aRtimestamp,
        aPtimestamp,
        bRtimestamp,
        bPtimestamp,
        sRtimestamp,
        sPtimestamp,
        oRtimestamp,
        oPtimestamp,
        rRtimestamp,
        rPtimestamp,
        pRtimestamp,
        pPtimestamp,
      ]) => {
        const form1Data = {
          ie: {
            cnst: document.querySelector('input[name="customConsent"]:checked')?.value || "",
            ct: document.getElementById("cancer_type").value,
            ag: document.getElementById("patAge_endm").value,
            sx: document.querySelector('input[name="customRadio_endm"]:checked').value,
            tpr: document.querySelector('input[name="customProcedure_endm"]:checked').value,
            dpr: document.getElementById("procedureDetail_endm").value,
            srn: document.getElementById("surgeonName_endm").value,
            mts: document.querySelector('input[name="MetastasisSample_endm"]:checked').value,
            es: document.getElementById("eventSelection_endm").value,
            mspt: proType,
            dm: document.querySelector('input[name="denovo_endm"]:checked')?.value || "",
            ag_ms: document.getElementById("mpt_age_endm").value || "",
            site: document.getElementById("mpt_site_endm").value || "",
            rcpt: document.getElementById("mpt_rs_endm").value || "",
            ss: document.querySelector('input[name="specimenSample_endm"]:checked').value,
            nft: document.getElementById("ft_tubes_endm").value,
            ftg: ftSgrid,
            nfn: document.getElementById("fn_tubes_endm").value,
            fng: fnSgrid,
            bs: document.querySelector('input[name="bloodSample_endm"]:checked').value,
            bsg: Serumgrid,
            bpg: plasmagrid,
            bbcg: buffyCoatgrid,
            osmp: document.querySelector('input[name="otherSample_endm"]:checked').value,
            osg: otherSgrid,
            osdsc: document.getElementById("otSampleDesc_endm").value,
            rltS: document.querySelector('input[name="rltSample_endm"]:checked').value,
            rlt: rltSgrid,
            pcS: document.querySelector('input[name="pcbSample_endm"]:checked').value,
            pssvl: document.querySelector('input[name="pcbV_endm"]:checked')?.value || "",
            pc: pcSgrid,
            iss: document.querySelector('input[name="IschemicRadio_endm"]:checked')?.value || "",
            nact: document.querySelector('input[name="NACT_endm"]:checked')?.value || "",
            nactdc: document.getElementById("NACT_cycle_endm").value || "",
            nactdlc: document.getElementById("NACT_cycle_D_endm").value || "",
            scpt: document.querySelector('input[name="processedRadio_endm"]:checked')?.value || "",
            prb: document.getElementById("processedBy_endm").value,
            srt: aRtimestamp, // These will now either be valid timestamps or null
            spt: aPtimestamp,
            bspb: document.getElementById("BprocessedBy_endm").value,
            brt: bRtimestamp,
            bpt: bPtimestamp,
            sspb: document.getElementById("SprocessedBy_endm").value,
            sprt: sRtimestamp,
            sppt: sPtimestamp,
            ospb: document.getElementById("OprocessedBy_endm").value,
            osrt: oRtimestamp,
            ospt: oPtimestamp,
            rltpb: document.getElementById("RLTprocessedBy_endm").value,
            rsrt: rRtimestamp,
            rspt: rPtimestamp,
            psspb: document.getElementById("PCprocessedBy_endm").value,
            psrt: pRtimestamp,
            pspt: pPtimestamp,
            sef_ub: user,
          },
        };
        return form1Data;
      },
    );
  }
}

function validateForm2() {
  function getTumorSize(cancer_type) {
    function getTumorSzeIds(ct) {
      if (ct === "brst") return { p1: "tumorSizeL", p2: "tumorSizeW", p3: "tumorSizeH" };
      if (ct === "endm") return { p1: "tumorSizeL_endm", p2: "tumorSizeW_endm", p3: "tumorSizeH_endm" };
      if (ct === "ceix") return { p1: "tumorSizeL_ceix", p2: "tumorSizeW_ceix", p3: "tumorSizeH_ceix" };
      if (ct === "ovry") return { p1: "tumorSizeL_ovry", p2: "tumorSizeW_ovry", p3: "tumorSizeH_ovry" };
    }
    const { p1, p2, p3 } = getTumorSzeIds(cancer_type);

    const tL = document.getElementById(p1).value;
    const tW = document.getElementById(p2).value;
    const tH = document.getElementById(p3).value;

    return `${tL}x${tW}x${tH}`;
  }
  function getAJCC(cancer_type) {
    function getAJCCIds(ct) {
      if (ct === "brst") return { p1: "AJCC1", p2: "AJCC2" };
      if (ct === "endm") return { p1: "FIGO1_endm", p2: "FIGO2_endm" };
      if (ct === "ceix") return { p1: "AJCC1_ceix", p2: "AJCC2_ceix" };
      if (ct === "ovry") return { p1: "FIGO1_ovry_2021", p2: "FIGO2_ovry_2021" };
      if (ct === "ovry1") return { p1: "FIGO1_ovry_2014", p2: "FIGO2_ovry_2014" };
    }
    const { p1, p2 } = getAJCCIds(cancer_type) || {};

    if (!p1 || !p2) {
      return "";
    }

    const ajcc1 = document.getElementById(p1)?.value || "";
    const ajcc2 = document.getElementById(p2)?.value || "";
    return `${ajcc1}${ajcc2}`;
  }
  function getCVSYM(cancer_type) {
    function getCVSYMIds(ct) {
      if (ct === "brst") return { p1: "cvSym", p2: "cmd" };
      if (ct === "endm") return { p1: "cvSym_endm", p2: "cmd_endm" };
      if (ct === "ceix") return { p1: "cvSym_ceix", p2: "cmd_ceix" };
      if (ct === "ovry") return { p1: "cvSym_ovry", p2: "cmd_ovry" };
    }
    const { p1, p2 } = getCVSYMIds(cancer_type) || {};

    if (!p1 || !p2) {
      return [];
    }

    const dropdownContainer = document.getElementById(p1);
    if (!dropdownContainer) {
      return [];
    }

    const commandBlocks = dropdownContainer.getElementsByClassName(p2);

    const medResults = [];

    for (let i = 0; i < commandBlocks.length; i += 3) {
      const selectBlock = commandBlocks[i];
      const inputBlock = commandBlocks[i + 1];

      if (!selectBlock || !inputBlock) {
        continue;
      }

      const selectElement = selectBlock.querySelector("select");
      if (!selectElement) {
        continue;
      }

      const selectedOption = selectElement.value;

      if (selectedOption.toLowerCase() === "other") {
        const input1 = inputBlock.querySelector(".OtherInput1");
        const input2 = inputBlock.querySelector(".OtherInput2");
        medResults.push({
          selectedOption,
          textValue: {
            input1: input1?.value || "",
            input2: input2?.value || "",
          },
        });
      } else {
        const textInput = inputBlock.querySelector("input");
        medResults.push({
          selectedOption,
          textValue: textInput?.value || "",
        });
      }
    }
    return medResults;
  }
  function getOtherTissue(cancer_type) {
    function getOtherTissueName(ct) {
      if (ct === "endm") return "ot_endm";
    }

    const name = getOtherTissueName(cancer_type);

    // get all checked checkboxes
    const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);

    const result = [];

    checkboxes.forEach((cb) => {
      const label = document.querySelector(`label[for="${cb.id}"]`);
      let text = label ? label.innerText.trim() : "";

      // check if it has extra input (Other / Cannot be determined)
      const targetId = cb.getAttribute("data-toggle-target");

      if (targetId) {
        const input = document.getElementById(targetId);
        if (input && input.value.trim()) {
          text = input.value.trim(); // override with typed value
        }
      }

      result.push({
        op: cb.value,
        text: text,
      });
    });

    return result;
  }

  function getOvrypst() {
    const checkbox = document.querySelectorAll('input[name="histologicType_ovry"]:checked');
    const result = [];

    checkbox.forEach((cb) => {
      const targetId = cb.getAttribute("data-toggle-target");

      const subtypeEntry = { op: cb.value };
      if (targetId) {
        const input = document.getElementById(targetId);
        const detailText = input?.value.trim() || "";

        if (detailText) {
          subtypeEntry.text = detailText;
        }
      }

      result.push(subtypeEntry);
    });

    return result;
  }

  function getOvrytst() {
    const checkbox = document.querySelectorAll(`input[name="tumorSite_ovry"]:checked`);
    const result = [];

    checkbox.forEach((cb) => {
      const label = document.querySelector(`label[for="${cb.id}"]`);
      let text = label ? label.innerText.trim() : "";

      // check if it has extra input (Other / Cannot be determined)
      const targetId = cb.getAttribute("data-toggle-target");

      if (targetId) {
        const input = document.getElementById(targetId);
        if (input && input.value.trim()) {
          text = input.value.trim(); // override with typed value
        }
        result.push({
          op: cb.value,
          text: text,
        });
      } else {
        result.push({
          op: cb.value,
        });
      }
    });

    return result;
  }

  function getOvryOt() {
    const checkbox = document.querySelectorAll(`input[name="ot_ovry"]:checked`);
    const result = [];

    checkbox.forEach((cb) => {
      const label = document.querySelector(`label[for="${cb.id}"]`);
      // option otOp14_ovry and otOp15_ovry add txt field
      const targetId = cb.getAttribute("data-toggle-target");
      let text = label ? label.innerText.trim() : "";

      if (targetId) {
        const input = document.getElementById(targetId);
        if (input && input.value.trim()) {
          text = input.value.trim(); // override with typed value
        }
        result.push({
          op: cb.value,
          text: text,
        });
      } else {
        result.push({
          op: cb.value,
        });
      }
    });

    return result;
  }

  function getOvryls() {
    const checkboxes = document.querySelectorAll(`input[name="LC_ovry"]:checked`);
    const result = [];

    checkboxes.forEach((cb) => {
      result.push(cb.value);
    });

    return result;
  }

  function getCeixtst() {
    const result = [];

    const checkboxes = document.querySelectorAll('input[name="tumorSite_ceix"]:checked');

    checkboxes.forEach((cb) => {
      if (cb.value === "O") {
        const val = document.getElementById("tumorOtherSpecify_ceix")?.value.trim();

        if (val) {
          result.push({
            op: cb.value,
            text: val,
          });
        } else {
          result.push({
            op: cb.value,
          });
        }
      } else {
        result.push({
          op: cb.value,
        });
      }
    });

    return result;
  }
  function getSubtypeCeix() {
    const result = [];

    const checkboxes = document.querySelectorAll('input[name="pSubtype_ceix"]:checked');

    checkboxes.forEach((cb) => {
      if (cb.value === "op21") {
        const val = document.getElementById("pSubtypeOther_ceix")?.value.trim();

        if (val) {
          result.push({
            op: cb.value,
            text: val,
          });
        } else {
          result.push({
            op: cb.value,
          });
        }
      } else {
        result.push({
          op: cb.value,
        });
      }
    });

    return result;
  }
  const cancer_type = document.getElementById("cancer_type").value;

  if (cancer_type === "brst") {
    const tumorSize = getTumorSize(cancer_type);
    const ajcc = getAJCC(cancer_type);
    const medResults = getCVSYM(cancer_type);

    const form2Data = {
      md: {
        fhc: document.querySelector('input[name="RadioFHabit"]:checked')?.value || "",
        fhcr: document.getElementById("familyRelation").value || "",
        fhct: document.getElementById("familyCancerType").value || "",
        fh: document.querySelector('input[name="RadioFdHabit"]:checked')?.value || "",
        hac: document.querySelector('input[name="RadioAlcoholHabit"]:checked')?.value || "",
        hs: document.querySelector('input[name="RadioSmokeHabit"]:checked')?.value || "",
        ec: document.querySelector('input[name="ECH"]:checked')?.value || "",
        cm: medResults,
        ffqc: document.getElementById("ffQcComments").value || "",
        ftr: document.getElementById("ffTissueRemarks").value || "",
        tst: document.querySelector('input[name="tumorSite"]:checked')?.value || "",
        tp: document.getElementById("tumorPercentage").value || "",
        ad: document.getElementById("ageAtDiagnosis").value || "",
        cs: document.getElementById("clinicalStage")?.value || "",
        ihcm: document.querySelector('input[name="IHC"]:checked')?.value || "",
        ihcd: document.getElementById("IHC_Description")?.value || "",
        gt: document.querySelector('input[name="GeneticT"]:checked')?.value || "",
        gtr: document.getElementById("gtr")?.value || "",
        gtd: document.getElementById("GT_Description")?.value || "",
        pst: document.getElementById("subtype").value || "",
        pstOt: document.getElementById("pstOt").value || "",
        gd: document.getElementById("sampleGrade")?.value || "",
        fc: document.querySelector('input[name="focal"]:checked')?.value || "",
        dcis: document.querySelector('input[name="dcis"]:checked')?.value || "",
        dcisgd: document.getElementById("dcisGrade")?.value || "",
        lvi: document.querySelector('input[name="LVI"]:checked')?.value || "",
        pni: document.querySelector('input[name="PNI"]:checked')?.value || "",
        ptnm: document.getElementById("pTNM")?.value || "",
        as: ajcc || "",
        nnt: document.getElementById("nodesTested").value || "",
        npn: document.getElementById("positiveNodes").value || "",
        tsz: tumorSize,
        rcbs: document.getElementById("rcbScores").value || "",
        rcbc: document.getElementById("rcbClass").value || "",
        act: document.querySelector('input[name="ACT"]:checked')?.value || "",
        actdc: document.getElementById("actDrugCycles").value || "",
        actdls: document.getElementById("actDateLastCycle").value || "",
        rd: document.querySelector('input[name="RadioT"]:checked')?.value || "",
        rdd1: document.getElementById("rtDetails1").value || "",
        rdd2: document.getElementById("rtDetails2").value || "",
        rdd3: document.getElementById("rtDetails3").value || "",
        rtdls: document.getElementById("radiotherapyLastCycleDate").value || "",
        hrt: document.querySelector('input[name="horT"]:checked')?.value || "",
        hrtD: document.getElementById("hormone_Cycles").value || "",
        trt: document.querySelector('input[name="tarT"]:checked')?.value || "",
        trtD: document.getElementById("Tar_Cycles").value || "",
        mdu: user,
        ipba: document.querySelector('input[name="pbT"]:checked')?.value || "",
        ipbainfo: document.getElementById("PBInput")?.value || "",
      },
    };
    return form2Data;
  } else if (cancer_type === "endm") {
    const tumorSize = getTumorSize(cancer_type);
    const ajcc = getAJCC(cancer_type);
    const medResults = getCVSYM(cancer_type);
    const otherTissue = getOtherTissue(cancer_type);
    const form2Data = {
      md: {
        fhc: document.querySelector('input[name="RadioFHabit_endm"]:checked')?.value || "",
        fhcr: document.getElementById("familyRelation_endm")?.value || "",
        fhct: document.getElementById("familyCancerType_endm")?.value || "",
        hoc: document.querySelector('input[name="RadioHisOfC_endm"]:checked')?.value || "",
        typ: document.getElementById("typ_endm")?.value || "",
        treat: document.getElementById("treatment_endm")?.value || "",
        fh: document.querySelector('input[name="RadioFdHabit_endm"]:checked')?.value || "",
        hac: document.querySelector('input[name="RadioAlcoholHabit_endm"]:checked')?.value || "",
        hs: document.querySelector('input[name="RadioSmokeHabit_endm"]:checked')?.value || "",
        ec: document.querySelector('input[name="ECH_endm"]:checked')?.value || "",
        cm: medResults,
        ffqc: document.getElementById("ffQcComments_endm")?.value || "",
        ftr: document.getElementById("ffTissueRemarks_endm")?.value || "",

        ad: document.getElementById("ageAtDiagnosis_endm")?.value || "",
        cs: document.getElementById("clinicalStage_endm")?.value || "",
        ihcm: document.querySelector('input[name="IHC_endm"]:checked')?.value || "",
        ihcd: document.getElementById("IHC_Description_endm")?.value || "",
        gt: document.querySelector('input[name="GeneticT_endm"]:checked')?.value || "",
        gtr: document.getElementById("gtr_endm")?.value || "",
        gtd: document.getElementById("GT_Description_endm")?.value || "",
        sint: document.querySelector('input[name="sint_endm"]:checked')?.value || "",
        sintOther: document.getElementById("sint_other_specify_endm")?.value || "",
        pst: document.getElementById("subtype_endm")?.value || "",
        pstOt: document.getElementById("pstOt_endm")?.value || "",
        gd: document.getElementById("sampleGrade_endm")?.value || "",
        gdOther: document.getElementById("sampleGradeDetails_endm")?.value || "",

        mInv: document.querySelector('input[name="mInv_endm"]:checked')?.value || "",
        dmInv: document.getElementById("depthMyometrialInvasion_endm")?.value || "",
        pmInv: document.getElementById("percentageMyometrialInvasion_endm")?.value || "",

        usi: document.querySelector('input[name="uterineSerosalInvolvement_endm"]:checked')?.value || "",
        usiEx: document.getElementById("uterineSerosalInvolvement_explain_endm")?.value || "",
        lusi: document.querySelector('input[name="lowerUterineSegmentInvolvement_endm"]:checked')?.value || "",
        melf: document.querySelector('input[name="melf_pattern_of_invasion_endm"]:checked')?.value || "",
        bcg: document.getElementById("back_endm")?.value || "",
        subInv: document.getElementById("sub_inv_endm")?.value || "",

        cer: document.getElementById("cer_endm")?.value || "",
        cerDetail: document.getElementById("cerDetails_endm")?.value || "",

        pcwi: document.querySelector('input[name="percentage_endm"]:checked')?.value || "",
        pcwiOther:
          document.querySelector('input[name="percentage_endm"]:checked')?.value === "explain"
            ? document.getElementById("percentageExplainDetails_endm")?.value || ""
            : document.querySelector('input[name="percentage_endm"]:checked')?.value === "percentage"
              ? document.getElementById("percentageDetails_endm")?.value || ""
              : "",

        ot: otherTissue,

        pafi: document.getElementById("pafi_endm")?.value || "",
        pafiD: document.getElementById("pafiDetails_endm")?.value || "",
        lvi: document.querySelector('input[name="LVI_endm"]:checked')?.value || "",
        lviOth: document.getElementById("lviOther_endm")?.value || "",
        numF: document.getElementById("numF_endm")?.value || "",
        ptnm: document.getElementById("pTNM_endm")?.value || "",
        as: ajcc || "",
        typND: document.getElementById("typND_endm")?.value || "",
        nnt: document.getElementById("nodesTested_endm")?.value || "",
        npn: document.getElementById("positivePelvicNodes_endm")?.value || "",
        pant: document.getElementById("paraAorticNodesTested_endm")?.value || "",
        ppan: document.getElementById("positiveParaAorticNodes_endm")?.value || "",
        tsz: tumorSize,
        act: document.querySelector('input[name="ACT_endm"]:checked')?.value || "",
        actdc: document.getElementById("actDrugCycles_endm")?.value || "",
        actdls: document.getElementById("actDateLastCycle_endm")?.value || "",
        rd: document.querySelector('input[name="RadioT_endm"]:checked')?.value || "",
        rdd1: document.getElementById("rtDetails1_endm")?.value || "",
        rdd2: document.getElementById("rtDetails2_endm")?.value || "",
        rdd3: document.getElementById("rtDetails3_endm")?.value || "",
        rtdls: document.getElementById("radiotherapyLastCycleDate_endm")?.value || "",
        hrt: document.querySelector('input[name="horT_endm"]:checked')?.value || "",
        hrtD: document.getElementById("hormone_Cycles_endm")?.value || "",
        trt: document.querySelector('input[name="tarT_endm"]:checked')?.value || "",
        trtD: document.getElementById("Tar_Cycles_endm")?.value || "",
        mdu: user,
        ipba: document.querySelector('input[name="pbT_endm"]:checked')?.value || "",
        ipbainfo: document.getElementById("PBInput_endm")?.value || "",
      },
    };

    return form2Data;
  } else if (cancer_type === "ceix") {
    const tumorSize = getTumorSize(cancer_type);
    const tstRes = getCeixtst();
    const pstres = getSubtypeCeix();
    const medResults = getCVSYM(cancer_type);
    const form2Data = {
      md: {
        fhc: document.querySelector('input[name="RadioFHabit_ceix"]:checked')?.value || "",
        fhcr: document.getElementById("familyRelation_ceix").value || "",
        fhct: document.getElementById("familyCancerType_ceix").value || "",

        aam: document.getElementById("ageAtMarriage_ceix").value || "",
        afc: document.getElementById("ageAtFirstCoitus_ceix").value || "",
        afb: document.getElementById("ageOfFirstChildbirth_ceix").value || "",

        fh: document.querySelector('input[name="RadioFdHabit_ceix"]:checked')?.value || "",
        hac: document.querySelector('input[name="RadioAlcoholHabit_ceix"]:checked')?.value || "",
        hs: document.querySelector('input[name="RadioSmokeHabit_ceix"]:checked')?.value || "",

        ec: document.querySelector('input[name="ECH_ceix"]:checked')?.value || "",
        cm: medResults,

        ffqc: document.getElementById("ffQcComments_ceix").value || "",
        ftr: document.getElementById("ffTissueRemarks_ceix").value || "",

        tst: tstRes,

        tp: document.getElementById("tumorPercentage_ceix").value || "",

        ad: document.getElementById("ageAtDiagnosis_ceix").value || "",
        cs: document.getElementById("clinicalStage_ceix")?.value || "",
        hrhpv: document.getElementById("HRHPV_ceix")?.value || "",

        ihcm: document.querySelector('input[name="IHC_ceix"]:checked')?.value || "",
        ihcd: document.getElementById("IHC_Description_ceix")?.value || "",

        gt: document.querySelector('input[name="GeneticT_ceix"]:checked')?.value || "",
        gtr: document.getElementById("gtr_ceix")?.value || "",
        gtd: document.getElementById("GT_Description_ceix")?.value || "",

        pst: pstres,
        pstOt: document.getElementById("pSubtypeOther_ceix").value || "",

        gd: document.getElementById("sampleGrade_ceix")?.value || "",
        gdOther: document.getElementById("sampleGrade_specify_ceix")?.value || "",
        dsi: document.getElementById("dsi_ceix")?.value || "",
        spoi: document.querySelector('input[name="SPI_ceix"]:checked')?.value || "",
        ot: document.querySelector('input[name="ot_ceix"]:checked')?.value || "",
        otOther: document.getElementById("ot_specify_ceix").value || "",
        lvi: document.querySelector('input[name="LVI_ceix"]:checked')?.value || "",
        msic: document.querySelector('input[name="msic_ceix"]:checked')?.value || "",
        msicL: document.getElementById("msic_loc_ceix")?.value || "",
        msicD: document.getElementById("msic_dlc_ceix")?.value || "",
        msicI: document.getElementById("msic_involved_ceix")?.value || "",
        ms: document.querySelector('input[name="ms_hsil_ais_ceix"]:checked')?.value || "",
        msL: document.getElementById("ms_hsil_ais_loc_ceix")?.value || "",
        msD: document.getElementById("ms_hsil_ais_dlc_ceix")?.value || "",
        msI: document.getElementById("ms_hsil_ais_involved_ceix")?.value || "",
        ptnm: document.getElementById("pTNM_ceix")?.value || "",
        as: document.getElementById("FIGO_ceix")?.value || "",

        nnt: document.getElementById("nodesTested_ceix")?.value || "",
        npn: document.getElementById("positiveNodes_ceix")?.value || "",
        pant: document.getElementById("nodesTested_pa_ceix")?.value || "",
        ppan: document.getElementById("positiveNodes_pa_ceix")?.value || "",

        tsz: tumorSize,
        act: document.querySelector('input[name="ACT_ceix"]:checked')?.value || "",
        actdc: document.getElementById("actDrugCycles_ceix").value || "",
        actdls: document.getElementById("actDateLastCycle_ceix").value || "",
        rd: document.querySelector('input[name="RadioT_ceix"]:checked')?.value || "",
        rdd1: document.getElementById("rtDetails1_ceix").value || "",
        rdd2: document.getElementById("rtDetails2_ceix").value || "",
        rdd3: document.getElementById("rtDetails3_ceix").value || "",
        rtdls: document.getElementById("radiotherapyLastCycleDate_ceix").value || "",
        trt: document.querySelector('input[name="tarT_ceix"]:checked')?.value || "",
        trtD: document.getElementById("Tar_Cycles_ceix").value || "",
        ipba: document.querySelector('input[name="pbT_ceix"]:checked')?.value || "",
        ipbainfo: document.getElementById("PBInput_ceix")?.value || "",
        mdu: user,
      },
    };

    return form2Data;
  } else if (cancer_type === "ovry") {
    const tumorSize = getTumorSize(cancer_type);
    const ajcc = getAJCC(cancer_type);
    const ajcc1 = getAJCC("ovry1");
    const medResults = getCVSYM(cancer_type);
    const tstRes = getOvrytst();
    const pstRes = getOvrypst();
    const otherRes = getOvryOt();
    const lsRes = getOvryls();

    const form2Data = {
      md: {
        bmi: document.getElementById("bmi_ovry").value || "",
        wad: document.getElementById("weightAtDiagnosis_ovry").value || "",
        loa: document.getElementById("lossOfAppetite_ovry").value || "",

        fhc: document.querySelector('input[name="RadioFHabit_ovry"]:checked')?.value || "",
        fhcr: document.getElementById("familyRelation_ovry").value || "",
        fhct: document.getElementById("familyCancerType_ovry").value || "",

        fh: document.querySelector('input[name="RadioFdHabit_ovry"]:checked')?.value || "",

        hac: document.querySelector('input[name="RadioAlcoholHabit_ovry"]:checked')?.value || "",
        hs: document.querySelector('input[name="RadioSmokeHabit_ovry"]:checked')?.value || "",

        ec: document.querySelector('input[name="ECH_ovry"]:checked')?.value || "",
        cm: medResults,

        ffqc: document.getElementById("ffQcComments_ovry").value || "",
        ftr: document.getElementById("ffTissueRemarks_ovry").value || "",

        tst: tstRes,

        tp: document.getElementById("tumorPercentage_ovry").value || "",
        ad: document.getElementById("ageAtDiagnosis_ovry").value || "",
        cs: document.getElementById("clinicalStage_ovry")?.value || "",

        ihcm: document.querySelector('input[name="IHC_ovry"]:checked')?.value || "",
        ihcd: document.getElementById("IHC_Description_ovry")?.value || "",

        gt: document.querySelector('input[name="GeneticT_ovry"]:checked')?.value || "",
        gtr: document.getElementById("gtr_ovry")?.value || "",
        gtrP: document.getElementById("gtrPositiveType_ovry")?.value || "",
        hrd: document.getElementById("hrd_ovry")?.value || "",
        brca: document.getElementById("brca_ngs_ovry")?.value || "",
        gtd: document.getElementById("GT_Description_ovry")?.value || "",

        si: document.getElementById("sInte_ovry")?.value || "",

        pst: pstRes,
        gd: document.getElementById("sampleGrade_ovry")?.value || "",
        gdOther: document.getElementById("sampleGradeExplain_ovry")?.value || "",

        osi: document.getElementById("osi_ovry")?.value || "",
        osiOth: document.getElementById("osiExplain_ovry")?.value || "",
        ftsi: document.getElementById("ftsi_ovry")?.value || "",
        ftsiOth: document.getElementById("ftsiExplain_ovry")?.value || "",
        ftstici: document.getElementById("ftstici_ovry")?.value || "",
        imp: document.getElementById("imp_ovry")?.value || "",
        impoth: document.getElementById("impExplain_ovry")?.value || "",

        ot: otherRes,

        lep: document.getElementById("lep_ovry")?.value || "",
        lepOth: document.getElementById("lepExplain_ovry")?.value || "",
        pafi: document.getElementById("pafi_ovry")?.value || "",
        pafiOth: document.getElementById("pafiExplain_ovry")?.value || "",
        pfi: document.getElementById("pfi_ovry")?.value || "",
        pfiOth: document.getElementById("pfiExplain_ovry")?.value || "",

        lvi: document.querySelector('input[name="LVI_ovry"]:checked')?.value || "",
        ptnm: document.getElementById("pTNM_ovry")?.value || "",

        ihcp53: document.getElementById("ihc_p53_ovry")?.value || "",
        biopsy: document.getElementById("biopsy_hpe_number_ovry")?.value || "",
        surHpe: document.getElementById("surgery_hpe_number_ovry")?.value || "",
        bish: document.getElementById("biopsy_date_ovry")?.value || "",
        surD: document.getElementById("surgery_date_ovry")?.value || "",

        mra: document.querySelector('input[name="mutation_report_available_ovry"]:checked')?.value || "",
        bioS: document.getElementById("biopsy_site_ovry")?.value || "",
        bioD: document.getElementById("biopsy_diagnosis_ovry")?.value || "",
        as: ajcc || "",
        as1: ajcc1 || "",
        nnt: document.getElementById("nodesTested_ovry")?.value || "",
        npn: document.getElementById("positiveNodes_ovry")?.value || "",
        pant: document.getElementById("nodesTested_pa_ovry")?.value || "",
        ppan: document.getElementById("positiveNodes_pa_ovry")?.value || "",
        sld: document.getElementById("largestDeposit_ovry")?.value || "",
        tsz: tumorSize,
        act: document.querySelector('input[name="ACT_ovry"]:checked')?.value || "",
        actdc: document.getElementById("actDrugCycles_ovry")?.value || "",
        actdls: document.getElementById("actDateLastCycle_ovry")?.value || "",

        lc: lsRes,
        hipec: document.getElementById("hipecDrugCycles_ovry")?.value || "",
        hipecD: document.getElementById("hipecDateLastCycle_ovry")?.value || "",
        nipec: document.getElementById("nipecDrugCycles_ovry")?.value || "",
        nipecD: document.getElementById("nipecDateLastCycle_ovry")?.value || "",
        pidac: document.querySelector('input[name="PIDAC_ovry"]:checked')?.value || "",
        pidacD: document.getElementById("pidacDrugCycles_ovry")?.value || "",
        pci: document.getElementById("pciScore_ovry")?.value || "",

        rd: document.querySelector('input[name="RadioT_ovry"]:checked')?.value || "",
        rdd1: document.getElementById("rtDetails1_ovry")?.value || "",
        rdd2: document.getElementById("rtDetails2_ovry")?.value || "",
        rdd3: document.getElementById("rtDetails3_ovry")?.value || "",
        rtdls: document.getElementById("radiotherapyLastCycleDate_ovry")?.value || "",
        hrt: document.querySelector('input[name="horT_ovry"]:checked')?.value || "",
        hrtD: document.getElementById("hormone_Cycles_ovry")?.value || "",
        trt: document.querySelector('input[name="tarT_ovry"]:checked')?.value || "",

        parp: document.querySelector('input[name="PARP_ovry"]:checked')?.value || "",
        parpdc: document.getElementById("parpDrugCycles_ovry")?.value || "",
        parpls: document.getElementById("parpDateLastCycle_ovry")?.value || "",

        trtD: document.getElementById("Tar_Cycles_ovry")?.value || "",
        ipba: document.querySelector('input[name="pbT_ovry"]:checked')?.value || "",
        ipbainfo: document.getElementById("PBInput_ovry")?.value || "",
        mdu: user,
      },
    };

    return form2Data;
  }
}

function validateForm3() {
  const cancer_type = document.getElementById("cancer_type").value;

  if (cancer_type === "brst") {
    const form3Data = {
      brf: {
        am: document.getElementById("ageAtMenarche").value || "",
        pty: document.getElementById("parity").value || "",
        noc: document.getElementById("numChild").value || "",
        afc: document.getElementById("ageAtFirstChild").value || "",
        bf: document.querySelector('input[name="breFd"]:checked')?.value || "",
        dbf: document.getElementById("dbf").value || "",
        ms: document.querySelector('input[name="mStatus"]:checked')?.value || "",
        er: document.querySelector('input[name="ERRadio"]:checked')?.value || "",
        pr: document.querySelector('input[name="PRRadio"]:checked')?.value || "",
        h2: document.querySelector('input[name="HER2Radio"]:checked')?.value || "",
        sbt: document.getElementById("sbt").value || "",
        pcsm: document.getElementById("pcsm").value || "",
        pcvm: document.getElementById("pcvm").value || "",
        k67: document.getElementById("k67").value || "",
        ht: document.getElementById("HistologicalS").value || "",
        sps: document.getElementById("sps").value || "",
        brfu: user,
      },
    };

    return form3Data;
  } else if (cancer_type === "ceix") {
    const form3Data = {
      brf: {
        am: document.getElementById("ageAtMenarche_ceix").value || "",
        pty: document.getElementById("parity_ceix").value || "",
        noc: document.getElementById("numChild_ceix").value || "",
        ms: document.querySelector('input[name="mStatus_ceix"]:checked')?.value || "",
        p16: document.querySelector('input[name="p16IHC_ceix"]:checked')?.value || "",
        p16Other: document.getElementById("other_ihc_ceix").value || "",
        pcsm: document.getElementById("pcsm_ceix").value || "",
        pcvm: document.getElementById("pcvm_ceix").value || "",
        sps: document.getElementById("sps_ceix").value || "",
        brfu: user,
      },
    };

    return form3Data;
  } else if (cancer_type === "ovry") {
    const form3Data = {
      brf: {
        am: document.getElementById("ageAtMenarche_ovry").value || "",
        pty: document.getElementById("parity_ovry").value || "",
        noc: document.getElementById("numChild_ovry").value || "",
        bf: document.querySelector('input[name="breFd_ovry"]:checked')?.value || "",
        dbf: document.getElementById("dbf_ovry").value || "",
        ms: document.querySelector('input[name="mStatus_ovry"]:checked')?.value || "",
        caD: document.getElementById("ca_125_D_ovry").value || "",
        caP: document.getElementById("ca_125_P_ovry").value || "",
        caFU: document.getElementById("ca_125_FU_ovry").value || "",
        caO: document.getElementById("ca_125_O_ovry").value || "",
        ihc: document.getElementById("ihc_ovry").value || "",
        pcsm: document.getElementById("pcsm_ovry").value || "",
        pcvm: document.getElementById("pcvm_ovry").value || "",
        k67: document.getElementById("k67_ovry").value || "",
        brfu: user,
      },
    };

    return form3Data;
  } else if (cancer_type === "endm") {
    const form3Data = {
      brf: {
        am: document.getElementById("ageAtMenarche_endm").value || "",
        pty: document.getElementById("parity_endm").value || "",
        noc: document.getElementById("numChild_endm").value || "",
        ms: document.querySelector('input[name="mStatus_endm"]:checked')?.value || "",
        er: document.querySelector('input[name="ERRadio_endm"]:checked')?.value || "",
        pr: document.querySelector('input[name="PRRadio_endm"]:checked')?.value || "",
        pole: document.getElementById("pole_endm").value || "",
        mmr: document.getElementById("mmr_endm").value || "",
        p53: document.getElementById("p53_endm").value || "",
        betaC: document.getElementById("beta_catenin_endm").value || "",
        oth: document.getElementById("others_endm").value || "",
        pcsm: document.getElementById("pcsm_endm").value || "",
        pcvm: document.getElementById("pcvm_endm").value || "",
        k67: document.getElementById("k67_endm").value || "",
        brfu: user,
      },
    };

    return form3Data;
  }
}

function redirectAfterSampleEntry(mode) {
  switch (mode) {
    case "SearchView":
    case "SearchEdit":
      window.location.href = "search.html";
      break;
    case "PendingView":
    case "PendingEdit":
    case "EditFollowUps":
    case "ViewFollowUp":
      window.location.href = "todo.html";
      break;
    case "undefined":
      window.location.href = "home.html";
      break;
    default:
      window.location.href = "statistics.html";

      console.error("Unknown mode:", mode);
  }
}

function saveToFirebase(data) {
  const bioBankId = document.getElementById("bioBankId").value;
  const timestamp = Math.floor(Date.now() / 1000);
  const mrnData = document.getElementById("mrnNo").value;
  if (bioBankId && mrnData && bioBankId !== "" && mrnData !== "") {
    db.ref(`sef/${bioBankId}`).once("value", (snapshot) => {
      const sections = snapshot.val();
      let nextSectionIndex = 1;

      if (sections) {
        const sectionKeys = Object.keys(sections);
        sectionKeys.forEach((key) => {
          const sectionNumber = parseInt(key.replace("s", ""), 10);
          if (sectionNumber >= nextSectionIndex) {
            nextSectionIndex = sectionNumber + 1;
          }
        });
      }

      const nextSection = `s${nextSectionIndex}`;

      const formattedData = {
        ie: data.ie,
        md: data.md,
        brf: data.brf,
      };
      db.ref(`sef/${bioBankId}/${nextSection}/${timestamp}`)
        .set(data)
        .then(() => {
          alert("Form submitted successfully");
        })
        .catch((error) => {
          console.error("Error writing to Firebase", error);
        });

      db.ref(`bbnmrn/${mrnData}`)
        .set(bioBankId)
        .then(() => {
          console.log("stored in bbnmrn");
        })
        .catch((error) => {
          console.error("Error storing in bbnmrn:", error);
        });

      const dueDate = new Date();
      const threeMonthInMinutes = 3 * 30 * 24 * 60; // Approximation of 3 months in minutes
      dueDate.setMinutes(dueDate.getMinutes() + threeMonthInMinutes);

      const bioBankPath = `pfw/${bioBankId}`;

      db.ref(bioBankPath)
        .once("value")
        .then((snapshot) => {
          let mode = localStorage.getItem("mode");

          if (snapshot.exists()) {
            redirectAfterSampleEntry(mode);
          } else {
            db.ref(bioBankPath)
              .set(dueDate.getTime()) // Store as Unix timestamp (milliseconds since 1970)
              .then(() => {
                redirectAfterSampleEntry(mode);
              })
              .catch((error) => {
                console.error("Error storing in pfw:", error);
              });
          }
        })
        .catch((error) => {
          console.error("Error checking path existence:", error);
        });
    });
  } else if (!bioBankId || bioBankId === "") {
    alert("Biobank ID is missing");
    console.warn("Biobank ID is missing");
  } else if (!mrnData || mrnData === "") {
    alert("MRN Number is missing");
    console.warn("MRN Number is missing");
  } else {
    alert("Biobank ID or MRN Number is missing");
    console.warn("Biobank ID or MRN Number is missing");
  }
}

function updateToFirebase(data) {
  const timestamp = Math.floor(Date.now() / 1000);
  const bioBankId = document.getElementById("bioBankId").value;
  const mrnData = document.getElementById("mrnNo").value;

  if (bioBankId && mrnData && bioBankId !== "" && mrnData !== "") {
    db.ref(`sef/${bioBankId}`).once("value", (snapshot) => {
      const sections = snapshot.val();

      if (sections) {
        const sectionKeys = Object.keys(sections);
        const lastSection = sectionKeys[sectionKeys.length - 1];
        const formattedData = {
          ie: data.ie,
          md: data.md,
          brf: data.brf,
        };

        db.ref(`sef/${bioBankId}/${lastSection}/${timestamp}`)
          .set(formattedData)
          .then(() => {
            let user = sessionStorage.getItem("userName");
            let mode = localStorage.getItem("mode");

            let act = {
              mode: "",
              user: user,
            };

            const finalizeUpdate = () => {
              alert("Form updated successfully ");
              redirectAfterSampleEntry(mode);
            };

            if (mode === "SearchEdit" || mode === "PendingEdit") {
              db.ref(`act/${bioBankId}/${lastSection}`)
                .set(act)
                .then(() => {
                  finalizeUpdate();
                })
                .catch((error) => {
                  console.error("Error setting new act: ", error);
                });
            } else {
              finalizeUpdate();
            }
          })
          .catch((error) => {
            console.error("Error writing to Firebase", error);
          });
      } else {
        const firstSection = `s1`;

        db.ref(`sef/${bioBankId}/${firstSection}/${timestamp}`)
          .set(data)
          .then(() => {
            db.ref(`bb/${boxName}/${seatIndex}`)
              .update(seatUpdate)
              .then(() => {
                console.log(`Seat ${seatID} updated successfully in Firebase.`);
              })
              .catch((error) => {
                console.error(`Error updating seat ${seatID}:`, error);
              });
          })
          .catch((error) => {
            console.error("Error writing to Firebase", error);
          });
      }
    });
  } else if (!bioBankId || bioBankId === "") {
    alert("Biobank ID is missing");
  } else if (!mrnData || mrnData === "") {
    alert("MRN Number is missing");
  } else {
    alert("Biobank ID or MRN Number is missing");
  }
}

function patients() {
  function getIds(ct) {
    if (ct === "brst") {
      return {
        bloodSampleY: "bloodSampleY",
        specimenSampleY: "specimenSampleY",
        otherSampleY: "otherSampleY",
        rltSampleY: "rltSampleY",
        pcbSampleY: "pcbSampleY",
        patAge: "patAge",
        customRadio: "customRadio",
        sampleGrade: "sampleGrade",
        customProcedure: "customProcedure",
      };
    } else if (ct === "endm") {
      return {
        bloodSampleY: "bloodSampleY_endm",
        specimenSampleY: "specimenSampleY_endm",
        otherSampleY: "otherSampleY_endm",
        rltSampleY: "rltSampleY_endm",
        pcbSampleY: "pcbSampleY_endm",
        patAge: "patAge_endm",
        customRadio: "customRadio_endm",
        sampleGrade: "sampleGrade_endm",
        customProcedure: "customProcedure_endm",
      };
    } else if (ct === "ceix") {
      return {
        bloodSampleY: "bloodSampleY_ceix",
        specimenSampleY: "specimenSampleY_ceix",
        otherSampleY: "otherSampleY_ceix",
        rltSampleY: "rltSampleY_ceix",
        pcbSampleY: "pcbSampleY_ceix",
        patAge: "patAge_ceix",
        customRadio: "customRadio_ceix",
        sampleGrade: "sampleGrade_ceix",
        customProcedure: "customProcedure_ceix",
      };
    } else if (ct === "ovry") {
      return {
        bloodSampleY: "bloodSampleY_ovry",
        specimenSampleY: "specimenSampleY_ovry",
        otherSampleY: "otherSampleY_ovry",
        rltSampleY: "rltSampleY_ovry",
        pcbSampleY: "pcbSampleY_ovry",
        patAge: "patAge_ovry",
        customRadio: "customRadio_ovry",
        sampleGrade: "sampleGrade_ovry",
        customProcedure: "customProcedure_ovry",
      };
    }
  }
  const cancer_type = document.getElementById("cancer_type")?.value || ""; // Type of Cancer

  const { bloodSampleY, specimenSampleY, otherSampleY, rltSampleY, pcbSampleY, patAge, customRadio, sampleGrade, customProcedure } = getIds(cancer_type);
  const bioBankId = document.getElementById("bioBankId").value;
  const timestamp = Math.floor(Date.now() / 1000); // Current timestamp

  let smtyArray = [];
  const bloodSampleSelected = document.getElementById(bloodSampleY).checked;
  const specimenSampleSelected = document.getElementById(specimenSampleY).checked;
  const otherSampleSelected = document.getElementById(otherSampleY).checked;
  const rltSampleSelected = document.getElementById(rltSampleY).checked;
  const pcbSampleSelected = document.getElementById(pcbSampleY).checked;
  if (bloodSampleSelected) smtyArray.push("B");
  if (specimenSampleSelected) smtyArray.push("S");
  if (otherSampleSelected) smtyArray.push("O");
  if (rltSampleSelected) smtyArray.push("R");
  if (pcbSampleSelected) smtyArray.push("P");
  const smty = smtyArray.join(",");

  db.ref(`Patients/${bioBankId}`).once("value", (snapshot) => {
    const sections = snapshot.val();
    let nextSectionIndex = 1; // Start with 's1'

    if (sections) {
      const sectionKeys = Object.keys(sections);
      sectionKeys.forEach((key) => {
        const sectionNumber = parseInt(key.replace("s", ""), 10);
        if (sectionNumber >= nextSectionIndex) {
          nextSectionIndex = sectionNumber + 1;
        }
      });
    }
    const nextSection = `s${nextSectionIndex}`;
    const patientInfo = {
      age: document.getElementById(patAge).value, // Assuming 'patAge' is the age input field
      ct: cancer_type, // Type of Cancer
      gndr: document.querySelector(`input[name="${customRadio}"]:checked`)?.value || "", // Gender
      grc: document.getElementById(sampleGrade)?.value || "", // Grade of Cancer
      smty: smty || "",
      typ: document.querySelector(`input[name="${customProcedure}"]:checked`)?.value || "", // Type of Procedure
      ts: timestamp,
    };
    db.ref(`Patients/${bioBankId}/${nextSection}`)
      .set(patientInfo)
      .then(() => {
        console.log("Patient info saved successfully.");
      })
      .catch((error) => {
        console.error("Error writing to Firebase", error);
      });

    const mrnData = document.getElementById("mrnNo").value; // If you need to handle MRN number as well
  });
}

const upUrlParams = new URLSearchParams(window.location.search);
const update = upUrlParams.get("update");

function pages_display(mode, bioBankId, seq, timestampKey) {
  localStorage.setItem("bioBankId", bioBankId);
  localStorage.setItem("lastSection", seq);

  if (seq != "") {
    var dataPath = `sef/${bioBankId}/${seq}/${timestampKey}`;
  } else {
    var dataPath = `Fw/${bioBankId}/${timestampKey}`;
  }

  localStorage.setItem("bioid", bioBankId);
  localStorage.setItem("mode", mode);

  sessionStorage.removeItem("formData");

  if (mode != "") {
    db.ref(dataPath)
      .once("value")
      .then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();

          sessionStorage.setItem("formData", JSON.stringify(data));
          const storedData = sessionStorage.getItem("formData");
          if (storedData) {
            const parsedData = JSON.parse(storedData); // Convert it back to an object
          } else {
            console.log("No formData found in sessionStorage");
          }
          switch (mode) {
            case "SearchView":
            case "PendingView":
              localStorage.setItem("selectedGrid", "");
              window.location.href = `default.html?hideMnrId=true`;
              break;
            case "SearchEdit":
            case "PendingEdit":
              localStorage.setItem("selectedGrid", "");
              window.location.href = `default.html?update=true`;
              break;
            case "EditFollowUps":
              localStorage.setItem("selectedGrid", "");
              window.location.href = `default.html?mode=edit`;
              break;
            case "ViewFollowUp":
              localStorage.setItem("selectedGrid", "");
              window.location.href = `default.html?mode=view`;
              break;

            default:
              console.error("Unknown mode:", mode);
          }
        } else {
          console.error("No data found at the specified path");
        }
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  } else if (mode === "") {
    localStorage.setItem("selectedGrid", "");
    window.location.href = "default.html";
  }
}

// Breast
async function fillIeForm(ieData) {
  // Helper Function
  const gridData = (gridValue) => {
    return new Promise((resolve) => {
      const gridVal = gridValue;
      if (gridVal) {
        let parts = gridVal.split("/");
        let boxID = parts[0];
        db.ref(`bn/`)
          .once("value")
          .then((snapshot) => {
            let boxIDs = snapshot.val();
            const boxEntry = Object.entries(boxIDs).find(([id, name]) => id === boxID);
            if (boxEntry) {
              const [id, name] = boxEntry;
              parts[0] = name;
              const updatedgridNo = parts.join("/");

              resolve(updatedgridNo);
            } else {
              resolve(gridVal); // If no match found, resolve with original value
            }
          });
      } else {
        resolve(null); // If invalid or empty, resolve with null
      }
    });
  };
  // Helper Function
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return { date: "", time: "" };

    const dateObj = new Date(timestamp * 1000);

    const date = dateObj.toISOString().split("T")[0];
    const time = dateObj.toTimeString().split(" ")[0];
    return { date, time };
  };

  const bioid = localStorage.getItem("bioid");
  const bioidParts = bioid.match(/^([A-Za-z]+)(\d+)$/);
  if (bioidParts) {
    const prefix = bioidParts[1];
    let number = bioidParts[2];
    const paddedNumber = number.padStart(4, "0");
    document.getElementById("bioBankId").value = `${prefix}${paddedNumber}`;
  }

  if (ieData.cnst) document.querySelector(`input[name="customConsent"][value="${ieData.cnst}"]`).checked = true || "";

  document.getElementById("cancer_type").value = ieData.ct || "";
  toggleCancerSampleEntry(ieData.ct);

  document.getElementById("patAge").value = ieData.ag || "";

  if (ieData.sx) document.querySelector(`input[name="customRadio"][value="${ieData.sx}"]`).checked = true || "";

  if (ieData.tpr) document.querySelector(`input[name="customProcedure"][value="${ieData.tpr}"]`).checked = true || "";

  document.getElementById("procedureDetail").value = ieData.dpr || "";

  document.getElementById("surgeonName").value = ieData.srn;

  if (ieData.mts) document.querySelector(`input[name="MetastasisSample"][value="${ieData.mts}"]`).checked = true || "";
  document.getElementById("eventSelection").value = ieData.es;
  if (ieData.dm) document.querySelector(`input[name="denovo"][value="${ieData.dm}"]`).checked = true || "";
  document.getElementById("mpt_age").value = ieData.ag_ms || "";
  document.getElementById("mpt_site").value = ieData.site || "";
  document.getElementById("mpt_rs").value = ieData.rcpt || "";
  if (ieData.ss) document.querySelector(`input[name="specimenSample"][value="${ieData.ss}"]`).checked = true || "";

  const [ftGridNo, fnGridNo, plasmaGridNo, SerumGridNo, BuffyGridNo, otherGridNo, rltSgridNo, pcSgridNo] = await Promise.all([
    gridData(ieData.ftg),
    gridData(ieData.fng),
    gridData(ieData.bpg),
    gridData(ieData.bsg),
    gridData(ieData.bbcg),
    gridData(ieData.osg),
    gridData(ieData.rlt),
    gridData(ieData.pc),
  ]);
  specimenSample();
  document.getElementById("ft_tubes").value = ieData.nft || "";
  document.getElementById("ftgrid").value = ftGridNo || "";
  document.getElementById("fn_tubes").value = ieData.nfn || "";
  document.getElementById("fngrid").value = fnGridNo || "";

  if (ieData.bs) document.querySelector(`input[name="bloodSample"][value="${ieData.bs}"]`).checked = true || "";
  bloodSample();
  document.getElementById("PlasmagridNo").value = plasmaGridNo || ""; // Set the resolved value
  document.getElementById("SerumgridNo").value = SerumGridNo || "";
  document.getElementById("bufferCoatgridNo").value = BuffyGridNo || "";

  if (ieData.osmp) document.querySelector(`input[name="otherSample"][value="${ieData.osmp}"]`).checked = true || "";
  otherSample();

  document.getElementById("OSgridNo").value = otherGridNo || "";
  document.getElementById("otSampleDesc").value = ieData.osdsc || "";

  if (ieData.rltS) document.querySelector(`input[name="rltSample"][value="${ieData.rltS}"]`).checked = true || "";
  rltSample();
  document.getElementById("rltSgridNo").value = rltSgridNo || "";

  if (ieData.pcS) document.querySelector(`input[name="pcbSample"][value="${ieData.pcS}"]`).checked = true || "";
  if (ieData.pssvl !== undefined && ieData.pssvl !== "") document.querySelector(`input[name="pcbV"][value="${ieData.pssvl}"]`).checked = true || "";
  pcbSample();
  document.getElementById("pcSgridNo").value = pcSgridNo || "";

  if (ieData.iss) document.querySelector(`input[name="IschemicRadio"][value="${ieData.iss}"]`).checked = true || "";

  if (ieData.nact) document.querySelector(`input[name="NACT"][value="${ieData.nact}"]`).checked = true || "";
  NactYes();
  document.getElementById("nactEff").value = ieData.nactEff || "";
  document.getElementById("NACT_cycle").value = ieData.nactdc || "";
  document.getElementById("NACT_cycle_D").value = ieData.nactdlc || "";
  document.getElementById("processedBy").value = ieData.prb || "";

  if (ieData.scpt) document.querySelector(`input[name="processedRadio"][value="${ieData.scpt}"]`).checked = true || "";

  sampleReceive();
  document.getElementById("BprocessedBy").value = ieData.bspb || "";
  document.getElementById("SprocessedBy").value = ieData.sspb || "";
  document.getElementById("OprocessedBy").value = ieData.ospb || "";
  document.getElementById("RLTprocessedBy").value = ieData.rltpb || "";
  document.getElementById("PCprocessedBy").value = ieData.psspb || "";

  document.getElementById("sefdataEB").value = ieData.sef_ub || "";

  const srt = formatTimestamp(ieData.srt);
  document.getElementById("sampleReceivedDate").value = srt.date;
  document.getElementById("sampleReceivedTime").value = srt.time;

  const spt = formatTimestamp(ieData.spt);
  document.getElementById("sampleProcessedDate").value = spt.date;
  document.getElementById("sampleProcessedTime").value = spt.time;

  const brt = formatTimestamp(ieData.brt);
  document.getElementById("bloodSampleReceivedDate").value = brt.date;
  document.getElementById("bloodSampleReceivedTime").value = brt.time;

  const bpt = formatTimestamp(ieData.bpt);
  document.getElementById("bloodSampleProcessedDate").value = bpt.date;
  document.getElementById("bloodSampleProcessedTime").value = bpt.time;

  const sprt = formatTimestamp(ieData.sprt);
  document.getElementById("SpecimenSampleReceivedDate").value = sprt.date;
  document.getElementById("SpecimenSampleReceivedTime").value = sprt.time;

  const sppt = formatTimestamp(ieData.sppt);
  document.getElementById("SpecimenSampleProcessedDate").value = sppt.date;
  document.getElementById("SpecimenSampleProcessedTime").value = sppt.time;

  const osrt = formatTimestamp(ieData.osrt);
  document.getElementById("OtherSampleReceivedDate").value = osrt.date;
  document.getElementById("OtherSampleReceivedTime").value = osrt.time;

  const ospt = formatTimestamp(ieData.ospt);
  document.getElementById("OtherSampleProcessedDate").value = ospt.date;
  document.getElementById("OtherSampleProcessedTime").value = ospt.time;

  const rsrt = formatTimestamp(ieData.rsrt);
  document.getElementById("RLTSampleReceivedDate").value = rsrt.date;
  document.getElementById("RLTSampleReceivedTime").value = rsrt.time;

  const rspt = formatTimestamp(ieData.rspt);
  document.getElementById("RLTSampleProcessedDate").value = rspt.date;
  document.getElementById("RLTSampleProcessedTime").value = rspt.time;

  const psrt = formatTimestamp(ieData.psrt);
  document.getElementById("PCSampleReceivedDate").value = psrt.date;
  document.getElementById("PCSampleReceivedTime").value = psrt.time;

  const pspt = formatTimestamp(ieData.pspt);
  document.getElementById("PCSampleProcessedDate").value = pspt.date;
  document.getElementById("PCSampleProcessedTime").value = pspt.time;
}
// Endm
async function fillIeForm_endm(ieData) {
  try {
    // Helper Function
    const gridData = (gridValue) => {
      return new Promise((resolve) => {
        const gridVal = gridValue;
        if (gridVal) {
          let parts = gridVal.split("/");
          let boxID = parts[0];
          db.ref(`bn/`)
            .once("value")
            .then((snapshot) => {
              let boxIDs = snapshot.val();
              const boxEntry = Object.entries(boxIDs).find(([id, name]) => id === boxID);
              if (boxEntry) {
                const [id, name] = boxEntry;
                parts[0] = name;
                const updatedgridNo = parts.join("/");
                resolve(updatedgridNo);
              } else {
                resolve(gridVal); // If no match found, resolve with original value
              }
            });
        } else {
          resolve(null); // If invalid or empty, resolve with null
        }
      });
    };
    // Helper Function
    const formatTimestamp = (timestamp) => {
      if (!timestamp) return { date: "", time: "" };

      const dateObj = new Date(timestamp * 1000);

      const date = dateObj.toISOString().split("T")[0];
      const time = dateObj.toTimeString().split(" ")[0];
      return { date, time };
    };

    const bioid = localStorage.getItem("bioid");
    const bioidParts = bioid.match(/^([A-Za-z]+)(\d+)$/);
    if (bioidParts) {
      const prefix = bioidParts[1];
      let number = bioidParts[2];
      const paddedNumber = number.padStart(4, "0");
      document.getElementById("bioBankId").value = `${prefix}${paddedNumber}`;
    }

    if (ieData.cnst) document.querySelector(`input[name="customConsent"][value="${ieData.cnst}"]`).checked = true || "";

    const cancerTypeField = document.getElementById("cancer_type");
    cancerTypeField.value = ieData.ct || "";
    toggleCancerSampleEntry(ieData.ct);
    cancerTypeField.dispatchEvent(new Event("change"));

    document.getElementById("patAge_endm").value = ieData.ag || "";

    if (ieData.sx) document.querySelector(`input[name="customRadio_endm"][value="${ieData.sx}"]`).checked = true || "";

    if (ieData.tpr) document.querySelector(`input[name="customProcedure_endm"][value="${ieData.tpr}"]`).checked = true || "";

    document.getElementById("procedureDetail_endm").value = ieData.dpr || "";

    document.getElementById("surgeonName_endm").value = ieData.srn;

    if (ieData.mts) document.querySelector(`input[name="MetastasisSample_endm"][value="${ieData.mts}"]`).checked = true || "";
    document.getElementById("eventSelection_endm").value = ieData.es;
    if (ieData.dm) document.querySelector(`input[name="denovo_endm"][value="${ieData.dm}"]`).checked = true || "";
    document.getElementById("mpt_age_endm").value = ieData.ag_ms || "";
    document.getElementById("mpt_site_endm").value = ieData.site || "";
    document.getElementById("mpt_rs_endm").value = ieData.rcpt || "";
    if (ieData.ss) document.querySelector(`input[name="specimenSample_endm"][value="${ieData.ss}"]`).checked = true || "";

    const [ftGridNo, fnGridNo, plasmaGridNo, SerumGridNo, BuffyGridNo, otherGridNo, rltSgridNo, pcSgridNo] = await Promise.all([
      gridData(ieData.ftg),
      gridData(ieData.fng),
      gridData(ieData.bpg),
      gridData(ieData.bsg),
      gridData(ieData.bbcg),
      gridData(ieData.osg),
      gridData(ieData.rlt),
      gridData(ieData.pc),
    ]);
    specimenSample_endm();
    document.getElementById("ft_tubes_endm").value = ieData.nft || "";
    document.getElementById("ftgrid_endm").value = ftGridNo || "";
    document.getElementById("fn_tubes_endm").value = ieData.nfn || "";
    document.getElementById("fngrid_endm").value = fnGridNo || "";

    if (ieData.bs) document.querySelector(`input[name="bloodSample_endm"][value="${ieData.bs}"]`).checked = true || "";
    bloodSample_endm();
    document.getElementById("PlasmagridNo_endm").value = plasmaGridNo || ""; // Set the resolved value
    document.getElementById("SerumgridNo_endm").value = SerumGridNo || "";
    document.getElementById("bufferCoatgridNo_endm").value = BuffyGridNo || "";

    if (ieData.osmp) document.querySelector(`input[name="otherSample_endm"][value="${ieData.osmp}"]`).checked = true || "";
    otherSample_endm();

    document.getElementById("OSgridNo_endm").value = otherGridNo || "";
    document.getElementById("otSampleDesc_endm").value = ieData.osdsc || "";

    if (ieData.rltS) document.querySelector(`input[name="rltSample_endm"][value="${ieData.rltS}"]`).checked = true || "";
    rltSample_endm();
    document.getElementById("rltSgridNo_endm").value = rltSgridNo || "";

    if (ieData.pcS) document.querySelector(`input[name="pcbSample_endm"][value="${ieData.pcS}"]`).checked = true || "";
    if (ieData.pssvl) document.querySelector(`input[name="pcbV_endm"][value="${ieData.pssvl}"]`).checked = true || "";
    pcbSample_endm();
    document.getElementById("pcSgridNo_endm").value = pcSgridNo || "";

    if (ieData.iss) document.querySelector(`input[name="IschemicRadio_endm"][value="${ieData.iss}"]`).checked = true || "";

    if (ieData.nact) document.querySelector(`input[name="NACT_endm"][value="${ieData.nact}"]`).checked = true || "";
    NactYes_endm();
    document.getElementById("NACT_cycle_endm").value = ieData.nactdc || "";
    document.getElementById("NACT_cycle_D_endm").value = ieData.nactdlc || "";
    document.getElementById("processedBy_endm").value = ieData.prb || "";

    if (ieData.scpt) document.querySelector(`input[name="processedRadio_endm"][value="${ieData.scpt}"]`).checked = true || "";

    sampleReceive_endm();
    document.getElementById("BprocessedBy_endm").value = ieData.bspb || "";
    document.getElementById("SprocessedBy_endm").value = ieData.sspb || "";
    document.getElementById("OprocessedBy_endm").value = ieData.ospb || "";
    document.getElementById("RLTprocessedBy_endm").value = ieData.rltpb || "";
    document.getElementById("PCprocessedBy_endm").value = ieData.psspb || "";

    document.getElementById("sefdataEB_endm").value = ieData.sef_ub || "";

    const srt = formatTimestamp(ieData.srt);
    document.getElementById("sampleReceivedDate_endm").value = srt.date;
    document.getElementById("sampleReceivedTime_endm").value = srt.time;

    const spt = formatTimestamp(ieData.spt);
    document.getElementById("sampleProcessedDate_endm").value = spt.date;
    document.getElementById("sampleProcessedTime_endm").value = spt.time;

    const brt = formatTimestamp(ieData.brt);
    document.getElementById("bloodSampleReceivedDate_endm").value = brt.date;
    document.getElementById("bloodSampleReceivedTime_endm").value = brt.time;

    const bpt = formatTimestamp(ieData.bpt);
    document.getElementById("bloodSampleProcessedDate_endm").value = bpt.date;
    document.getElementById("bloodSampleProcessedTime_endm").value = bpt.time;

    const sprt = formatTimestamp(ieData.sprt);
    document.getElementById("SpecimenSampleReceivedDate_endm").value = sprt.date;
    document.getElementById("SpecimenSampleReceivedTime_endm").value = sprt.time;

    const sppt = formatTimestamp(ieData.sppt);
    document.getElementById("SpecimenSampleProcessedDate_endm").value = sppt.date;
    document.getElementById("SpecimenSampleProcessedTime_endm").value = sppt.time;

    const osrt = formatTimestamp(ieData.osrt);
    document.getElementById("OtherSampleReceivedDate_endm").value = osrt.date;
    document.getElementById("OtherSampleReceivedTime_endm").value = osrt.time;

    const ospt = formatTimestamp(ieData.ospt);
    document.getElementById("OtherSampleProcessedDate_endm").value = ospt.date;
    document.getElementById("OtherSampleProcessedTime_endm").value = ospt.time;

    const rsrt = formatTimestamp(ieData.rsrt);
    document.getElementById("RLTSampleReceivedDate_endm").value = rsrt.date;
    document.getElementById("RLTSampleReceivedTime_endm").value = rsrt.time;

    const rspt = formatTimestamp(ieData.rspt);
    document.getElementById("RLTSampleProcessedDate_endm").value = rspt.date;
    document.getElementById("RLTSampleProcessedTime_endm").value = rspt.time;

    const psrt = formatTimestamp(ieData.psrt);
    document.getElementById("PCSampleReceivedDate_endm").value = psrt.date;
    document.getElementById("PCSampleReceivedTime_endm").value = psrt.time;

    const pspt = formatTimestamp(ieData.pspt);
    document.getElementById("PCSampleProcessedDate_endm").value = pspt.date;
    document.getElementById("PCSampleProcessedTime_endm").value = pspt.time;
  } catch (error) {
    console.error("Error filling form1 in endm:", error);
  }
}
// Ovary
async function fillIeForm_ovry(ieData) {
  try {
    // Helper Function
    const gridData = (gridValue) => {
      return new Promise((resolve) => {
        const gridVal = gridValue;
        if (gridVal) {
          let parts = gridVal.split("/");
          let boxID = parts[0];
          db.ref(`bn/`)
            .once("value")
            .then((snapshot) => {
              let boxIDs = snapshot.val();
              const boxEntry = Object.entries(boxIDs).find(([id, name]) => id === boxID);
              if (boxEntry) {
                const [id, name] = boxEntry;
                parts[0] = name;
                const updatedgridNo = parts.join("/");

                resolve(updatedgridNo);
              } else {
                resolve(gridVal); // If no match found, resolve with original value
              }
            });
        } else {
          resolve(null); // If invalid or empty, resolve with null
        }
      });
    };
    // Helper Function
    const formatTimestamp = (timestamp) => {
      if (!timestamp) return { date: "", time: "" };

      const dateObj = new Date(timestamp * 1000);

      const date = dateObj.toISOString().split("T")[0];
      const time = dateObj.toTimeString().split(" ")[0];
      return { date, time };
    };

    const bioid = localStorage.getItem("bioid");
    const bioidParts = bioid.match(/^([A-Za-z]+)(\d+)$/);
    if (bioidParts) {
      const prefix = bioidParts[1];
      let number = bioidParts[2];
      const paddedNumber = number.padStart(4, "0");
      document.getElementById("bioBankId").value = `${prefix}${paddedNumber}`;
    }

    if (ieData.cnst) document.querySelector(`input[name="customConsent"][value="${ieData.cnst}"]`).checked = true || "";

    document.getElementById("cancer_type").value = ieData.ct || "";
    toggleCancerSampleEntry(ieData.ct);

    document.getElementById("patAge_ovry").value = ieData.ag || "";

    if (ieData.sx) document.querySelector(`input[name="customRadio_ovry"][value="${ieData.sx}"]`).checked = true || "";

    if (ieData.tpr) document.querySelector(`input[name="customProcedure_ovry"][value="${ieData.tpr}"]`).checked = true || "";

    document.getElementById("procedureDetail_ovry").value = ieData.dpr || "";

    document.getElementById("surgeonName_ovry").value = ieData.srn;

    if (ieData.mts) document.querySelector(`input[name="MetastasisSample_ovry"][value="${ieData.mts}"]`).checked = true || "";
    document.getElementById("eventSelection_ovry").value = ieData.es;
    if (ieData.dm) document.querySelector(`input[name="denovo_ovry"][value="${ieData.dm}"]`).checked = true || "";
    document.getElementById("mpt_age_ovry").value = ieData.ag_ms || "";
    document.getElementById("mpt_site_ovry").value = ieData.site || "";
    if (ieData.ss) document.querySelector(`input[name="specimenSample_ovry"][value="${ieData.ss}"]`).checked = true || "";

    const [ftGridNo, fnGridNo, plasmaGridNo, SerumGridNo, BuffyGridNo, otherGridNo, rltSgridNo, pcSgridNo] = await Promise.all([
      gridData(ieData.ftg),
      gridData(ieData.fng),
      gridData(ieData.bpg),
      gridData(ieData.bsg),
      gridData(ieData.bbcg),
      gridData(ieData.osg),
      gridData(ieData.rlt),
      gridData(ieData.pc),
    ]);
    specimenSample_ovry();
    document.getElementById("ft_tubes_ovry").value = ieData.nft || "";
    document.getElementById("ftgrid_ovry").value = ftGridNo || "";
    document.getElementById("fn_tubes_ovry").value = ieData.nfn || "";
    document.getElementById("fngrid_ovry").value = fnGridNo || "";

    if (ieData.bs) document.querySelector(`input[name="bloodSample_ovry"][value="${ieData.bs}"]`).checked = true || "";
    bloodSample_ovry();
    document.getElementById("PlasmagridNo_ovry").value = plasmaGridNo || ""; // Set the resolved value
    document.getElementById("SerumgridNo_ovry").value = SerumGridNo || "";
    document.getElementById("bufferCoatgridNo_ovry").value = BuffyGridNo || "";

    if (ieData.osmp) document.querySelector(`input[name="otherSample_ovry"][value="${ieData.osmp}"]`).checked = true || "";
    otherSample_ovry();

    document.getElementById("OSgridNo_ovry").value = otherGridNo || "";
    document.getElementById("otSampleDesc_ovry").value = ieData.osdsc || "";

    if (ieData.rltS) document.querySelector(`input[name="rltSample_ovry"][value="${ieData.rltS}"]`).checked = true || "";
    rltSample_ovry();
    document.getElementById("rltSgridNo_ovry").value = rltSgridNo || "";

    if (ieData.pcS) document.querySelector(`input[name="pcbSample_ovry"][value="${ieData.pcS}"]`).checked = true || "";
    if (ieData.pssvl) document.querySelector(`input[name="pcbV_ovry"][value="${ieData.pssvl}"]`).checked = true || "";
    pcbSample_ovry();
    document.getElementById("pcbSgridNo_ovry").value = pcSgridNo || "";

    if (ieData.iss) document.querySelector(`input[name="IschemicRadio_ovry"][value="${ieData.iss}"]`).checked = true || "";

    if (ieData.nact) document.querySelector(`input[name="NACT_ovry"][value="${ieData.nact}"]`).checked = true || "";
    NactYes_ovry();
    document.getElementById("nactCRSEff_ovry").value = ieData.crs || "";
    document.getElementById("NACT_cycle_ovry").value = ieData.nactdc || "";
    document.getElementById("NACT_cycle_D_ovry").value = ieData.nactdlc || "";
    document.getElementById("processedBy_ovry").value = ieData.prb || "";

    if (ieData.scpt) document.querySelector(`input[name="processedRadio_ovry"][value="${ieData.scpt}"]`).checked = true || "";

    sampleReceive_ovry();
    document.getElementById("BprocessedBy_ovry").value = ieData.bspb || "";
    document.getElementById("SprocessedBy_ovry").value = ieData.sspb || "";
    document.getElementById("OprocessedBy_ovry").value = ieData.ospb || "";
    document.getElementById("RLTprocessedBy_ovry").value = ieData.rltpb || "";
    document.getElementById("PCprocessedBy_ovry").value = ieData.psspb || "";

    document.getElementById("sefdataEB_ovry").value = ieData.sef_ub || "";

    const srt = formatTimestamp(ieData.srt);
    document.getElementById("sampleReceivedDate_ovry").value = srt.date;
    document.getElementById("sampleReceivedTime_ovry").value = srt.time;

    const spt = formatTimestamp(ieData.spt);
    document.getElementById("sampleProcessedDate_ovry").value = spt.date;
    document.getElementById("sampleProcessedTime_ovry").value = spt.time;

    const brt = formatTimestamp(ieData.brt);
    document.getElementById("bloodSampleReceivedDate_ovry").value = brt.date;
    document.getElementById("bloodSampleReceivedTime_ovry").value = brt.time;

    const bpt = formatTimestamp(ieData.bpt);
    document.getElementById("bloodSampleProcessedDate_ovry").value = bpt.date;
    document.getElementById("bloodSampleProcessedTime_ovry").value = bpt.time;

    const sprt = formatTimestamp(ieData.sprt);
    document.getElementById("SpecimenSampleReceivedDate_ovry").value = sprt.date;
    document.getElementById("SpecimenSampleReceivedTime_ovry").value = sprt.time;

    const sppt = formatTimestamp(ieData.sppt);
    document.getElementById("SpecimenSampleProcessedDate_ovry").value = sppt.date;
    document.getElementById("SpecimenSampleProcessedTime_ovry").value = sppt.time;

    const osrt = formatTimestamp(ieData.osrt);
    document.getElementById("OtherSampleReceivedDate_ovry").value = osrt.date;
    document.getElementById("OtherSampleReceivedTime_ovry").value = osrt.time;

    const ospt = formatTimestamp(ieData.ospt);
    document.getElementById("OtherSampleProcessedDate_ovry").value = ospt.date;
    document.getElementById("OtherSampleProcessedTime_ovry").value = ospt.time;

    const rsrt = formatTimestamp(ieData.rsrt);
    document.getElementById("RLTSampleReceivedDate_ovry").value = rsrt.date;
    document.getElementById("RLTSampleReceivedTime_ovry").value = rsrt.time;

    const rspt = formatTimestamp(ieData.rspt);
    document.getElementById("RLTSampleProcessedDate_ovry").value = rspt.date;
    document.getElementById("RLTSampleProcessedTime_ovry").value = rspt.time;

    const psrt = formatTimestamp(ieData.psrt);
    document.getElementById("PCSampleReceivedDate_ovry").value = psrt.date;
    document.getElementById("PCSampleReceivedTime_ovry").value = psrt.time;

    const pspt = formatTimestamp(ieData.pspt);
    document.getElementById("PCSampleProcessedDate_ovry").value = pspt.date;
    document.getElementById("PCSampleProcessedTime_ovry").value = pspt.time;
  } catch (error) {
    console.error("Error filling IE form for ovary:", error);
  }
}
// Cervix
async function fillIeForm_ceix(ieData) {
  try {
    // Helper Function
    const gridData = (gridValue) => {
      return new Promise((resolve) => {
        const gridVal = gridValue;
        if (gridVal) {
          let parts = gridVal.split("/");
          let boxID = parts[0];
          db.ref(`bn/`)
            .once("value")
            .then((snapshot) => {
              let boxIDs = snapshot.val();
              const boxEntry = Object.entries(boxIDs).find(([id, name]) => id === boxID);
              if (boxEntry) {
                const [id, name] = boxEntry;
                parts[0] = name;
                const updatedgridNo = parts.join("/");

                resolve(updatedgridNo);
              } else {
                resolve(gridVal); // If no match found, resolve with original value
              }
            });
        } else {
          resolve(null); // If invalid or empty, resolve with null
        }
      });
    };
    // Helper Function
    const formatTimestamp = (timestamp) => {
      if (!timestamp) return { date: "", time: "" };

      const dateObj = new Date(timestamp * 1000);

      const date = dateObj.toISOString().split("T")[0];
      const time = dateObj.toTimeString().split(" ")[0];
      return { date, time };
    };

    const bioid = localStorage.getItem("bioid");
    const bioidParts = bioid.match(/^([A-Za-z]+)(\d+)$/);
    if (bioidParts) {
      const prefix = bioidParts[1];
      let number = bioidParts[2];
      const paddedNumber = number.padStart(4, "0");
      document.getElementById("bioBankId").value = `${prefix}${paddedNumber}`;
    }

    if (ieData.cnst) document.querySelector(`input[name="customConsent"][value="${ieData.cnst}"]`).checked = true || "";

    document.getElementById("cancer_type").value = ieData.ct || "";
    toggleCancerSampleEntry(ieData.ct);

    document.getElementById("patAge_ceix").value = ieData.ag || "";

    if (ieData.sx) document.querySelector(`input[name="customRadio_ceix"][value="${ieData.sx}"]`).checked = true || "";

    if (ieData.tpr) document.querySelector(`input[name="customProcedure_ceix"][value="${ieData.tpr}"]`).checked = true || "";

    document.getElementById("procedureDetail_ceix").value = ieData.dpr || "";

    document.getElementById("surgeonName_ceix").value = ieData.srn;

    if (ieData.mts) document.querySelector(`input[name="MetastasisSample_ceix"][value="${ieData.mts}"]`).checked = true || "";
    document.getElementById("eventSelection_ceix").value = ieData.es;
    if (ieData.dm) document.querySelector(`input[name="denovo_ceix"][value="${ieData.dm}"]`).checked = true || "";
    document.getElementById("mpt_age_ceix").value = ieData.ag_ms || "";
    document.getElementById("mpt_site_ceix").value = ieData.site || "";
    document.getElementById("mpt_hpvs_ceix").value = ieData.hpvs || "";
    if (ieData.ss) document.querySelector(`input[name="specimenSample_ceix"][value="${ieData.ss}"]`).checked = true || "";

    const [ftGridNo, fnGridNo, plasmaGridNo, SerumGridNo, BuffyGridNo, otherGridNo, rltSgridNo, pcSgridNo] = await Promise.all([
      gridData(ieData.ftg),
      gridData(ieData.fng),
      gridData(ieData.bpg),
      gridData(ieData.bsg),
      gridData(ieData.bbcg),
      gridData(ieData.osg),
      gridData(ieData.rlt),
      gridData(ieData.pc),
    ]);
    specimenSample_ceix();
    document.getElementById("ft_tubes_ceix").value = ieData.nft || "";
    document.getElementById("ftgrid_ceix").value = ftGridNo || "";
    document.getElementById("fn_tubes_ceix").value = ieData.nfn || "";
    document.getElementById("fngrid_ceix").value = fnGridNo || "";

    if (ieData.bs) document.querySelector(`input[name="bloodsample_ceix"][value="${ieData.bs}"]`).checked = true || "";
    bloodsample_ceix();
    document.getElementById("PlasmagridNo_ceix").value = plasmaGridNo || ""; // Set the resolved value
    document.getElementById("SerumgridNo_ceix").value = SerumGridNo || "";
    document.getElementById("bufferCoatgridNo_ceix").value = BuffyGridNo || "";

    if (ieData.osmp) document.querySelector(`input[name="otherSample_ceix"][value="${ieData.osmp}"]`).checked = true || "";
    otherSample_ceix();

    document.getElementById("OSgridNo_ceix").value = otherGridNo || "";
    document.getElementById("otSampleDesc_ceix").value = ieData.osdsc || "";

    if (ieData.rltS) document.querySelector(`input[name="rltSample_ceix"][value="${ieData.rltS}"]`).checked = true || "";
    rltSample_ceix();
    document.getElementById("rltSgridNo_ceix").value = rltSgridNo || "";

    if (ieData.pcS) document.querySelector(`input[name="pcbSample_ceix"][value="${ieData.pcS}"]`).checked = true || "";
    if (ieData.pssvl) document.querySelector(`input[name="pcbV_ceix"][value="${ieData.pssvl}"]`).checked = true || "";
    pcbSample_ceix();
    document.getElementById("pcbSgridNo_ceix").value = pcSgridNo || "";

    if (ieData.iss) document.querySelector(`input[name="IschemicRadio_ceix"][value="${ieData.iss}"]`).checked = true || "";

    if (ieData.nact) document.querySelector(`input[name="NACT_ceix"][value="${ieData.nact}"]`).checked = true || "";
    NactYes_ceix();
    document.getElementById("NACT_cycle_ceix").value = ieData.nactdc || "";
    document.getElementById("NACT_cycle_D_ceix").value = ieData.nactdlc || "";
    document.getElementById("processedBy_ceix").value = ieData.prb || "";

    // NART
    if (ieData.nart) document.querySelector(`input[name="NART_ceix"][value="${ieData.nart}"]`).checked = true || "";
    NartYes_ceix();
    document.getElementById("NART_cycle_ceix").value = ieData.nartc || "";
    document.getElementById("NART_cycle_D_ceix").value = ieData.nartdc || "";
    document.getElementById("NART_cycle_T_ceix").value = ieData.narttc || "";
    document.getElementById("NART_cycle_DC_ceix").value = ieData.nartdcc || "";

    if (ieData.scpt) document.querySelector(`input[name="processedRadio_ceix"][value="${ieData.scpt}"]`).checked = true || "";

    sampleReceive_ceix();
    document.getElementById("BprocessedBy_ceix").value = ieData.bspb || "";
    document.getElementById("SprocessedBy_ceix").value = ieData.sspb || "";
    document.getElementById("OprocessedBy_ceix").value = ieData.ospb || "";
    document.getElementById("RLTprocessedBy_ceix").value = ieData.rltpb || "";
    document.getElementById("PCprocessedBy_ceix").value = ieData.psspb || "";

    document.getElementById("sefdataEB_ceix").value = ieData.sef_ub || "";

    const srt = formatTimestamp(ieData.srt);
    document.getElementById("sampleReceivedDate_ceix").value = srt.date;
    document.getElementById("sampleReceivedTime_ceix").value = srt.time;

    const spt = formatTimestamp(ieData.spt);
    document.getElementById("sampleProcessedDate_ceix").value = spt.date;
    document.getElementById("sampleProcessedTime_ceix").value = spt.time;

    const brt = formatTimestamp(ieData.brt);
    document.getElementById("bloodSampleReceivedDate_ceix").value = brt.date;
    document.getElementById("bloodSampleReceivedTime_ceix").value = brt.time;

    const bpt = formatTimestamp(ieData.bpt);
    document.getElementById("bloodSampleProcessedDate_ceix").value = bpt.date;
    document.getElementById("bloodSampleProcessedTime_ceix").value = bpt.time;

    const sprt = formatTimestamp(ieData.sprt);
    document.getElementById("SpecimenSampleReceivedDate_ceix").value = sprt.date;
    document.getElementById("SpecimenSampleReceivedTime_ceix").value = sprt.time;

    const sppt = formatTimestamp(ieData.sppt);
    document.getElementById("SpecimenSampleProcessedDate_ceix").value = sppt.date;
    document.getElementById("SpecimenSampleProcessedTime_ceix").value = sppt.time;

    const osrt = formatTimestamp(ieData.osrt);
    document.getElementById("OtherSampleReceivedDate_ceix").value = osrt.date;
    document.getElementById("OtherSampleReceivedTime_ceix").value = osrt.time;

    const ospt = formatTimestamp(ieData.ospt);
    document.getElementById("OtherSampleProcessedDate_ceix").value = ospt.date;
    document.getElementById("OtherSampleProcessedTime_ceix").value = ospt.time;

    const rsrt = formatTimestamp(ieData.rsrt);
    document.getElementById("RLTSampleReceivedDate_ceix").value = rsrt.date;
    document.getElementById("RLTSampleReceivedTime_ceix").value = rsrt.time;

    const rspt = formatTimestamp(ieData.rspt);
    document.getElementById("RLTSampleProcessedDate_ceix").value = rspt.date;
    document.getElementById("RLTSampleProcessedTime_ceix").value = rspt.time;

    const psrt = formatTimestamp(ieData.psrt);
    document.getElementById("PCSampleReceivedDate_ceix").value = psrt.date;
    document.getElementById("PCSampleReceivedTime_ceix").value = psrt.time;

    const pspt = formatTimestamp(ieData.pspt);
    document.getElementById("PCSampleProcessedDate_ceix").value = pspt.date;
    document.getElementById("PCSampleProcessedTime_ceix").value = pspt.time;
  } catch (e) {
    console.error("Error in filling CEIX form1 :", e);
  }
}

// Breast
function fillMdForm(mdData) {
  const formElements = [...document.querySelectorAll("input, select, textarea")];
  let mode = localStorage.getItem("mode");

  try {
    if (mdData.fhc !== "") document.querySelector(`input[name="RadioFHabit"][value="${mdData.fhc}"]`).checked = true || "";
    if (mdData.fh) document.querySelector(`input[name="RadioFdHabit"][value="${mdData.fh}"]`).checked = true || "";
    if (mdData.hac) document.querySelector(`input[name="RadioAlcoholHabit"][value="${mdData.hac}"]`).checked = true || "";
    if (mdData.hs) document.querySelector(`input[name="RadioSmokeHabit"][value="${mdData.hs}"]`).checked = true || "";
    if (mdData.ec) document.querySelector(`input[name="ECH"][value="${mdData.ec}"]`).checked = true || "";
    if (mdData.tst) document.querySelector(`input[name="tumorSite"][value="${mdData.tst}"]`).checked = true || "";
    if (mdData.ihcm) document.querySelector(`input[name="IHC"][value="${mdData.ihcm}"]`).checked = true || "";
    if (mdData.gt) document.querySelector(`input[name="GeneticT"][value="${mdData.gt}"]`).checked = true || "";
    if (mdData.fc) document.querySelector(`input[name="focal"][value="${mdData.fc}"]`).checked = true || "";
    if (mdData.dcis) document.querySelector(`input[name="dcis"][value="${mdData.dcis}"]`).checked = true || "";
    if (mdData.lvi) document.querySelector(`input[name="LVI"][value="${mdData.lvi}"]`).checked = true || "";
    if (mdData.pni) document.querySelector(`input[name="PNI"][value="${mdData.pni}"]`).checked = true || "";
    if (mdData.act) document.querySelector(`input[name="ACT"][value="${mdData.act}"]`).checked = true || "";
    if (mdData.rd) document.querySelector(`input[name="RadioT"][value="${mdData.rd}"]`).checked = true || "";
    if (mdData.hrt) document.querySelector(`input[name="horT"][value="${mdData.hrt}"]`).checked = true || "";
    if (mdData.trt) document.querySelector(`input[name="tarT"][value="${mdData.trt}"]`).checked = true || "";
    if (mdData.ipba) document.querySelector(`input[name="pbT"][value="${mdData.ipba}"]`).checked = true || "";
  } catch (e) {
    console.error("Error in filling radio buttons:", e);
  }
  familyHabitToggle();
  document.getElementById("familyRelation").value = mdData.fhcr || "";
  document.getElementById("familyCancerType").value = mdData.fhct || "";

  document.getElementById("ffQcComments").value = mdData.ffqc || "";
  document.getElementById("ffTissueRemarks").value = mdData.ftr || "";

  document.getElementById("tumorPercentage").value = mdData.tp || "";
  document.getElementById("ageAtDiagnosis").value = mdData.ad || "";
  document.getElementById("clinicalStage").value = mdData.cs || "";
  IHCMarker();

  document.getElementById("IHC_Description").value = mdData.ihcd || "";
  GeneticT();
  document.getElementById("gtr").value = mdData.gtr || "";
  document.getElementById("GT_Description").value = mdData.gtd || "";
  document.getElementById("subtype").value = mdData.pst || "";
  document.getElementById("pstOt").value = mdData.pstOt || "";
  document.getElementById("sampleGrade").value = mdData.gd || "";
  document.getElementById("dcisGrade").value = mdData.dcisgd || "";
  document.getElementById("pTNM").value = mdData.ptnm || "";
  if (mdData.as) {
    let ajcc = mdData.as;

    let ajcc1 = "",
      ajcc2 = "";
    if (ajcc === "IV") {
      ajcc1 = "IV";
      ajcc2 = "";
    } else {
      ajcc1 = ajcc.slice(0, -1);
      ajcc2 = ajcc.slice(-1);
    }
    document.getElementById("AJCC1").value = ajcc1 || "";
    document.getElementById("AJCC2").value = ajcc2 || "";
  }
  document.getElementById("nodesTested").value = mdData.nnt || "";
  document.getElementById("positiveNodes").value = mdData.npn || "";
  if (mdData.tsz) {
    const [tL, tW, tH] = mdData.tsz.split(/[xX]/);

    document.getElementById("tumorSizeL").value = tL !== undefined ? tL : "";
    document.getElementById("tumorSizeW").value = tW !== undefined ? tW : "";
    document.getElementById("tumorSizeH").value = tH !== undefined ? tH : "";
  }
  document.getElementById("rcbScores").value = mdData.rcbs || "";
  document.getElementById("rcbClass").value = mdData.rcbc || "";

  actYes();
  document.getElementById("actDrugCycles").value = mdData.actdc || "";
  document.getElementById("actDateLastCycle").value = mdData.actdls || "";
  RadioTYes();
  document.getElementById("rtDetails1").value = mdData.rdd1 || "";
  document.getElementById("rtDetails2").value = mdData.rdd2 || "";
  document.getElementById("rtDetails3").value = mdData.rdd3 || "";
  document.getElementById("radiotherapyLastCycleDate").value = mdData.rtdls || "";
  document.getElementById("hormone_Cycles").value = mdData.hrtD || "";
  document.getElementById("Tar_Cycles").value = mdData.trtD || "";
  document.getElementById("PBInput").value = mdData.ipbainfo || "";
  document.getElementById("mddataEB").value = mdData.mdu || "";

  if (mdData.cm) {
    let comMed = mdData.cm;
    const dropdownContainer = document.getElementById("cvSym");
    const keys = Object.keys(comMed);

    Object.keys(comMed).forEach((info) => {
      const data = comMed[info];

      const newDiv = document.createElement("div");
      const newDiv1 = document.createElement("div");
      const newDiv2 = document.createElement("div");

      newDiv.classList.add("col-sm-3", "mt-2", "cmd");
      newDiv1.classList.add("col-sm-8", "mt-2", "cmd");
      newDiv2.classList.add("col-sm-1", "mt-2", "pr-4", "cmd");
      const newSelect = document.createElement("select");
      const inputWrapper = document.createElement("div"); // This holds one or two inputs
      inputWrapper.classList.add("form-row");

      newSelect.classList.add("form-control");

      const options = [
        { value: "", text: "" },
        { value: "Diabetic", text: "Type 2 Diabetic Mellitus" },
        { value: "Cardiac", text: "Cardiac" },
        { value: "Hypertension", text: "Hypertension" },
        { value: "Other", text: "Other" },
      ];

      options.forEach((optionData) => {
        const option = document.createElement("option");
        option.value = optionData.value;
        option.textContent = optionData.text;
        if (optionData.value === data.selectedOption) {
          option.selected = true;
        }
        newSelect.appendChild(option);
      });
      if (data.selectedOption === "Other") {
        const otherInput1 = document.createElement("input");
        const otherInput2 = document.createElement("input");

        otherInput1.classList.add("form-control", "col-sm-6");
        otherInput2.classList.add("form-control", "col-sm-6");

        otherInput1.type = "text";
        otherInput2.type = "text";

        otherInput1.placeholder = "Comorbidity";
        otherInput2.placeholder = "Medicines";

        otherInput1.value = data.textValue.input1 || "";
        otherInput2.value = data.textValue.input2 || "";

        inputWrapper.appendChild(otherInput1);
        inputWrapper.appendChild(otherInput2);
      } else {
        const defaultInput = document.createElement("input");
        defaultInput.classList.add("form-control");
        defaultInput.type = "text";
        defaultInput.placeholder = "Medicines";
        defaultInput.value = data.textValue || "";
        inputWrapper.appendChild(defaultInput);
      }

      newDiv2.style.display = "flex";
      newDiv2.style.flexDirection = "row-reverse";
      const imgGroup = document.createElement("div");
      imgGroup.classList.add("input-group-append");

      const img1 = document.createElement("img");
      img1.src = "assets/images/delete-2.svg";
      img1.id = "cvSymRemBtn";
      img1.style.height = "36px";
      img1.style.width = "36px";
      img1.style.marginTop = "-2px";
      img1.style.cursor = "pointer";
      img1.addEventListener("click", function () {
        dropdownContainer.removeChild(newDiv);
        dropdownContainer.removeChild(newDiv1);
        dropdownContainer.removeChild(newDiv2);
      });

      imgGroup.appendChild(img1);

      newDiv.appendChild(newSelect);
      newDiv1.appendChild(inputWrapper);
      newDiv2.appendChild(imgGroup);

      dropdownContainer.appendChild(newDiv);
      dropdownContainer.appendChild(newDiv1);

      if (mode === "SearchView" || mode === "PendingView") {
        const inputs = dropdownContainer.querySelectorAll("input, select");
        inputs.forEach((input) => (input.disabled = true));
      }

      if (mode !== "SearchView" && mode !== "PendingView") {
        dropdownContainer.appendChild(newDiv2);
      }
      newSelect.addEventListener("change", function () {
        inputWrapper.innerHTML = "";

        if (this.value === "Other") {
          const otherInput1 = document.createElement("input");
          const otherInput2 = document.createElement("input");

          otherInput1.classList.add("form-control", "col-sm-6");
          otherInput2.classList.add("form-control", "col-sm-6");

          otherInput1.value = data.input1 || "";
          otherInput2.value = data.input2 || "";

          inputWrapper.appendChild(otherInput1);
          inputWrapper.appendChild(otherInput2);
        } else {
          const defaultInput = document.createElement("input");
          defaultInput.classList.add("form-control");
          defaultInput.type = "text";
          defaultInput.placeholder = "Medicines";
          inputWrapper.appendChild(defaultInput);
        }
      });
    });
  }
  ExistComorbidity();
}
// Endm
function fillMdForm_endm(mdData) {
  function isReadOnlyViewMode(mode) {
    return ["SearchView", "PendingView", "pendingView", "ViewFollowUp", "SharedView", "sharedView", "share", "view"].includes(mode);
  }

  function splitFigo(ajcc) {
    if (!ajcc) return { ajcc1: "", ajcc2: "" };

    ajcc = ajcc.trim();

    const figoOptionsByStage_endm = {
      I: ["", "A", "A1", "A2", "A3", "B", "C"],
      II: ["", "A", "B", "C"],
      III: ["", "A", "A1", "A2", "B", "B1", "B2", "C", "C1", "C1i", "C1ii", "C2", "C2i", "C2ii"],
      IV: ["", "A", "B", "C"],
    };

    // detect stage (longest first to avoid mismatch)
    const stages = ["III", "II", "IV", "I"];

    for (let stage of stages) {
      if (ajcc.startsWith(stage)) {
        const suffix = ajcc.slice(stage.length);

        // validate suffix
        if (figoOptionsByStage_endm[stage].includes(suffix)) {
          return {
            ajcc1: stage,
            ajcc2: suffix,
          };
        }
      }
    }

    // fallback (invalid case)
    return { ajcc1: ajcc, ajcc2: "" };
  }
  try {
    const formElements = [...document.querySelectorAll("input, select, textarea")];
    let mode = localStorage.getItem("mode");

    if (mdData.fhc) document.querySelector(`input[name="RadioFHabit_endm"][value="${mdData.fhc}"]`).checked = true || "";
    familyHabitToggle_endm();
    document.getElementById("familyRelation_endm").value = mdData.fhcr || "";
    document.getElementById("familyCancerType_endm").value = mdData.fhct || "";

    if (mdData.hoc) document.querySelector(`input[name="RadioHisOfC_endm"][value="${mdData.hoc}"]`).checked = true || "";
    RadioHisOfCToggle_endm();
    document.getElementById("typ_endm").value = mdData.typ || "";
    document.getElementById("treatment_endm").value = mdData.treat || "";

    if (mdData.fh) document.querySelector(`input[name="RadioFdHabit_endm"][value="${mdData.fh}"]`).checked = true || "";
    if (mdData.hac) document.querySelector(`input[name="RadioAlcoholHabit_endm"][value="${mdData.hac}"]`).checked = true || "";
    if (mdData.hs) document.querySelector(`input[name="RadioSmokeHabit_endm"][value="${mdData.hs}"]`).checked = true || "";
    if (mdData.ec) document.querySelector(`input[name="ECH_endm"][value="${mdData.ec}"]`).checked = true || "";
    console.log("Endometriosis data:", mdData.cm);

    document.getElementById("ffQcComments_endm").value = mdData.ffqc || "";
    document.getElementById("ffTissueRemarks_endm").value = mdData.ftr || "";
    document.getElementById("ageAtDiagnosis_endm").value = mdData.ad || "";
    document.getElementById("clinicalStage_endm").value = mdData.cs || "";

    if (mdData.ihcm) document.querySelector(`input[name="IHC_endm"][value="${mdData.ihcm}"]`).checked = true || "";
    IHCMarker_endm();
    document.getElementById("IHC_Description_endm").value = mdData.ihcd || "";

    if (mdData.gt) document.querySelector(`input[name="GeneticT_endm"][value="${mdData.gt}"]`).checked = true || "";
    GeneticT_endm();
    document.getElementById("gtr_endm").value = mdData.gtr || "";
    document.getElementById("GT_Description_endm").value = mdData.gtd || "";

    if (mdData.sint) {
      const selectedSint = document.querySelector(`input[name="sint_endm"][value="${mdData.sint}"]`);
      if (selectedSint) {
        selectedSint.checked = true;
        selectedSint.dispatchEvent(new Event("change"));
      }
    }
    if (mdData.sint === "other") {
      console.log("Other sint selected", mdData.sintOther);
      const container1 = document.getElementById("sint_other_specify_endm");
      if (container1) {
        container1.style.display = "block";
        container1.disabled = isReadOnlyViewMode(mode);
        container1.value = mdData.sintOther || "";
      }
    }

    document.getElementById("subtype_endm").value = mdData.pst || "";
    document.getElementById("pstOt_endm").value = mdData.pstOt || "";
    document.getElementById("sampleGrade_endm").value = mdData.gd || "";
    document.getElementById("sampleGradeDetails_endm").value = mdData.gdOther || "";
    if (mdData.mInv) document.querySelector(`input[name="mInv_endm"][value="${mdData.mInv}"]`).checked = true || "";
    mInv_endm();
    document.getElementById("depthMyometrialInvasion_endm").value = mdData.dmInv || "";
    document.getElementById("percentageMyometrialInvasion_endm").value = mdData.pmInv || "";
    if (mdData.usi) document.querySelector(`input[name="uterineSerosalInvolvement_endm"][value="${mdData.usi}"]`).checked = true || "";
    document.getElementById("uterineSerosalInvolvement_explain_endm").value = mdData.usiEx || "";
    if (mdData.lusi) document.querySelector(`input[name="lowerUterineSegmentInvolvement_endm"][value="${mdData.lusi}"]`).checked = true || "";
    if (mdData.melf) document.querySelector(`input[name="melf_pattern_of_invasion_endm"][value="${mdData.melf}"]`).checked = true || "";

    document.getElementById("back_endm").value = mdData.bcg || "";
    document.getElementById("sub_inv_endm").value = mdData.subInv || "";

    document.getElementById("cer_endm").value = mdData.cer || "";
    document.getElementById("cerDetails_endm").value = mdData.cerDetail || "";

    if (mdData.pcwi) document.querySelector(`input[name="percentage_endm"][value="${mdData.pcwi}"]`).checked = true || "";
    if (mdData.pcwi === "explain") {
      document.getElementById("percentageExplainDetails_endm").value = mdData.pcwiOther || "";
    } else if (mdData.pcwi === "percentage") {
      document.getElementById("percentageDetails_endm").value = mdData.pcwiOther || "";
    }

    if (mdData.ot) {
      const ot = mdData.ot;
      ot.forEach((item) => {
        const selectedOption = document.querySelector(`input[name="ot_endm"][value="${item.op}"]`);
        if (selectedOption) selectedOption.checked = true || "";
        if (item.op === "op15") document.getElementById("otOp15Explain_endm").value = item.text || "";
        if (item.op === "op14") document.getElementById("otOp14Explain_endm").value = item.text || "";
      });
    }

    document.getElementById("pafi_endm").value = mdData.pafi || "";
    document.getElementById("pafiDetails_endm").value = mdData.pafiD || "";
    if (mdData.lvi) document.querySelector(`input[name="LVI_endm"][value="${mdData.lvi}"]`).checked = true || "";

    if (mdData.lvi === "op3" || mdData.lvi === "op2") document.getElementById("numF_endm").value = mdData.numF || "";
    if (mdData.lvi === "op4") document.getElementById("lviOther_endm").value = mdData.lviOther || "";

    document.getElementById("pTNM_endm").value = mdData.ptnm || "";
    if (mdData.as) {
      const { ajcc1, ajcc2 } = splitFigo(mdData.as);
      console.log({ ajcc1, ajcc2 });
      const figoStageEndm = document.getElementById("FIGO1_endm");
      const figoSubStageEndm = document.getElementById("FIGO2_endm");

      if (figoStageEndm && figoSubStageEndm) {
        figoStageEndm.value = ajcc1 || "";
        figoStageEndm.dispatchEvent(new Event("change"));
        figoSubStageEndm.value = ajcc2 || "";
      }
    }
    document.getElementById("typND_endm").value = mdData.typND || "";

    document.getElementById("nodesTested_endm").value = mdData.nnt || "";
    document.getElementById("positivePelvicNodes_endm").value = mdData.npn || "";
    document.getElementById("paraAorticNodesTested_endm").value = mdData.pant || "";
    document.getElementById("positiveParaAorticNodes_endm").value = mdData.ppan || "";

    if (mdData.tsz) {
      const [tL, tW, tH] = mdData.tsz.split(/[xX]/);

      document.getElementById("tumorSizeL_endm").value = tL !== undefined ? tL : "";
      document.getElementById("tumorSizeW_endm").value = tW !== undefined ? tW : "";
      document.getElementById("tumorSizeH_endm").value = tH !== undefined ? tH : "";
    }
    if (mdData.act) document.querySelector(`input[name="ACT_endm"][value="${mdData.act}"]`).checked = true || "";
    actYes_endm();
    document.getElementById("actDrugCycles_endm").value = mdData.actdc || "";
    document.getElementById("actDateLastCycle_endm").value = mdData.actdls || "";

    if (mdData.rd) document.querySelector(`input[name="RadioT_endm"][value="${mdData.rd}"]`).checked = true || "";
    RadioTYes_endm();
    document.getElementById("rtDetails1_endm").value = mdData.rdd1 || "";
    document.getElementById("rtDetails2_endm").value = mdData.rdd2 || "";
    document.getElementById("rtDetails3_endm").value = mdData.rdd3 || "";
    document.getElementById("radiotherapyLastCycleDate_endm").value = mdData.rtdls || "";

    if (mdData.hrt) document.querySelector(`input[name="horT_endm"][value="${mdData.hrt}"]`).checked = true || "";
    document.getElementById("hormone_Cycles_endm").value = mdData.hrtD || "";

    if (mdData.trt) document.querySelector(`input[name="tarT_endm"][value="${mdData.trt}"]`).checked = true || "";
    document.getElementById("Tar_Cycles_endm").value = mdData.trtD || "";

    if (mdData.ipba) document.querySelector(`input[name="pbT_endm"][value="${mdData.ipba}"]`).checked = true || "";
    document.getElementById("PBInput_endm").value = mdData.ipbainfo || "";

    document.getElementById("mddataEB_endm").value = mdData.mdu || "";
    const comorbidityEntries = mdData.cm && typeof mdData.cm === "object" ? Object.values(mdData.cm).filter(Boolean) : [];
    if (comorbidityEntries.length > 0) {
      let comMed = mdData.cm;
      const dropdownContainer = document.getElementById("cvSym_endm");
      const comorbidityYes = document.getElementById("ECH1_endm");

      if (comorbidityYes && !comorbidityYes.checked) {
        comorbidityYes.checked = true || "";
      }

      if (dropdownContainer) {
        dropdownContainer.style.display = "";
      }

      const commandClass = "cmd_endm";

      Object.keys(comMed).forEach((info) => {
        const data = comMed[info];

        const newDiv = document.createElement("div");
        const newDiv1 = document.createElement("div");
        const newDiv2 = document.createElement("div");

        newDiv.classList.add("col-sm-3", "mt-2", commandClass);
        newDiv1.classList.add("col-sm-8", "mt-2", commandClass);
        newDiv2.classList.add("col-sm-1", "mt-2", "pr-4", commandClass);
        const newSelect = document.createElement("select");
        const inputWrapper = document.createElement("div"); // This holds one or two inputs
        inputWrapper.classList.add("form-row");

        newSelect.classList.add("form-control");

        const options = [
          { value: "", text: "Select" },
          { value: "Diabetic", text: "Type 2 Diabetic Mellitus" },
          { value: "Cardiac", text: "Cardiac History" },
          { value: "Hypertension", text: "Hypertension" },
          { value: "endm", text: "Endometriosis" },
          { value: "Other", text: "Other" },
        ];

        options.forEach((optionData) => {
          const option = document.createElement("option");
          option.value = optionData.value;
          option.textContent = optionData.text;
          if (optionData.value === data.selectedOption) {
            option.selected = true;
          }
          newSelect.appendChild(option);
        });
        if (data.selectedOption === "Other") {
          const otherInput1 = document.createElement("input");
          const otherInput2 = document.createElement("input");

          otherInput1.classList.add("form-control", "col-sm-6", "OtherInput1");
          otherInput2.classList.add("form-control", "col-sm-6", "OtherInput2");

          otherInput1.type = "text";
          otherInput2.type = "text";

          otherInput1.placeholder = "Comorbidity";
          otherInput2.placeholder = "Medicines";

          otherInput1.value = data.textValue.input1 || "";
          otherInput2.value = data.textValue.input2 || "";

          inputWrapper.appendChild(otherInput1);
          inputWrapper.appendChild(otherInput2);
        } else {
          const defaultInput = document.createElement("input");
          defaultInput.classList.add("form-control");
          defaultInput.type = "text";
          defaultInput.placeholder = "Medicines";
          defaultInput.value = data.textValue || "";
          inputWrapper.appendChild(defaultInput);
        }

        newDiv2.style.display = "flex";
        newDiv2.style.flexDirection = "row-reverse";
        const imgGroup = document.createElement("div");
        imgGroup.classList.add("input-group-append");

        const img1 = document.createElement("img");
        img1.src = "assets/images/delete-2.svg";
        img1.id = "cvSymRemBtn";
        img1.style.height = "36px";
        img1.style.width = "36px";
        img1.style.marginTop = "-2px";
        img1.style.cursor = "pointer";
        img1.addEventListener("click", function () {
          dropdownContainer.removeChild(newDiv);
          dropdownContainer.removeChild(newDiv1);
          dropdownContainer.removeChild(newDiv2);
        });

        imgGroup.appendChild(img1);

        newDiv.appendChild(newSelect);
        newDiv1.appendChild(inputWrapper);
        newDiv2.appendChild(imgGroup);

        dropdownContainer.appendChild(newDiv);
        dropdownContainer.appendChild(newDiv1);

        if (mode === "SearchView" || mode === "PendingView") {
          const inputs = dropdownContainer.querySelectorAll("input, select");
          inputs.forEach((input) => (input.disabled = true));
        }

        if (mode !== "SearchView" && mode !== "PendingView") {
          dropdownContainer.appendChild(newDiv2);
        }
        newSelect.addEventListener("change", function () {
          inputWrapper.innerHTML = "";

          if (this.value === "Other") {
            const otherInput1 = document.createElement("input");
            const otherInput2 = document.createElement("input");

            otherInput1.classList.add("form-control", "col-sm-6", "OtherInput1");
            otherInput2.classList.add("form-control", "col-sm-6", "OtherInput2");

            otherInput1.value = data.input1 || "";
            otherInput2.value = data.input2 || "";

            inputWrapper.appendChild(otherInput1);
            inputWrapper.appendChild(otherInput2);
          } else {
            const defaultInput = document.createElement("input");
            defaultInput.classList.add("form-control");
            defaultInput.type = "text";
            defaultInput.placeholder = "Medicines";
            inputWrapper.appendChild(defaultInput);
          }
        });
      });
    }
    ExistComorbidity_endm();
  } catch (e) {
    console.error("Error in filling radio buttons:", e);
  }
}
// Ovry
function fillMdForm_ovry(mdData) {
  function splitFigo(ajcc, year) {
    if (!ajcc) return { ajcc1: "", ajcc2: "" };

    ajcc = ajcc.trim();

    const figoOptionsByStage2021 = {
      I: ["", "A", "B", "C", "C1", "C2", "C3"],
      II: ["", "A", "B"],
      III: ["", "A1(i)", "A1(ii)", "A2", "B", "C"],
      IV: ["", "A", "B"],
    };
    const figoOptionsByStage2014 = {
      I: ["", "A", "B", "C", "C1", "C2", "C3"],
      II: ["", "A", "B"],
      III: ["", "A1(i)", "A1(ii)", "A2"],
      IV: ["", "A", "B"],
    };

    // detect stage (longest first to avoid mismatch)
    const stages = ["III", "II", "IV", "I"];

    for (let stage of stages) {
      if (ajcc.startsWith(stage)) {
        const suffix = ajcc.slice(stage.length);

        // validate suffix
        const figoOptionsByStage = year === "FIGO1_ovry_2021" ? figoOptionsByStage2021 : figoOptionsByStage2014;
        if (figoOptionsByStage[stage].includes(suffix)) {
          return {
            ajcc1: stage,
            ajcc2: suffix,
          };
        }
      }
    }

    // fallback (invalid case)
    return { ajcc1: ajcc, ajcc2: "" };
  }
  try {
    const formElements = [...document.querySelectorAll("input, select, textarea")];
    let mode = localStorage.getItem("mode");

    document.getElementById("bmi_ovry").value = mdData.bmi || "";
    document.getElementById("weightAtDiagnosis_ovry").value = mdData.wad || "";
    document.getElementById("lossOfAppetite_ovry").value = mdData.loa || "";

    if (mdData.fhc) document.querySelector(`input[name="RadioFHabit_ovry"][value="${mdData.fhc}"]`).checked = true || "";
    familyHabitToggle_ovry();
    document.getElementById("familyRelation_ovry").value = mdData.fhcr || "";
    document.getElementById("familyCancerType_ovry").value = mdData.fhct || "";

    if (mdData.fh) document.querySelector(`input[name="RadioFdHabit_ovry"][value="${mdData.fh}"]`).checked = true || "";
    if (mdData.hac) document.querySelector(`input[name="RadioAlcoholHabit_ovry"][value="${mdData.hac}"]`).checked = true || "";
    if (mdData.hs) document.querySelector(`input[name="RadioSmokeHabit_ovry"][value="${mdData.hs}"]`).checked = true || "";

    if (mdData.ec) document.querySelector(`input[name="ECH_ovry"][value="${mdData.ec}"]`).checked = true || "";

    document.getElementById("ffQcComments_ovry").value = mdData.ffqc || "";
    document.getElementById("ffTissueRemarks_ovry").value = mdData.ftr || "";
    if (Array.isArray(mdData.tst)) {
      mdData.tst.forEach((item) => {
        const optionValue = item?.op || item;
        const checkbox = document.querySelector(`input[name="tumorSite_ovry"][value="${optionValue}"]`);
        if (checkbox) {
          checkbox.checked = true || "";
          checkbox.dispatchEvent(new Event("change"));

          const targetId = checkbox.getAttribute("data-toggle-target");
          if (targetId && item?.text) {
            const targetInput = document.getElementById(targetId);
            if (targetInput) {
              targetInput.value = item.text;
            }
          }
        }
      });
    } else if (mdData.tst) {
      const checkbox = document.querySelector(`input[name="tumorSite_ovry"][value="${mdData.tst}"]`);
      if (checkbox) {
        checkbox.checked = true || "";
        checkbox.dispatchEvent(new Event("change"));
      }
    }

    document.getElementById("tumorPercentage_ovry").value = mdData.tp || "";
    document.getElementById("ageAtDiagnosis_ovry").value = mdData.ad || "";
    document.getElementById("clinicalStage_ovry").value = mdData.cs || "";

    if (mdData.ihcm) document.querySelector(`input[name="IHC_ovry"][value="${mdData.ihcm}"]`).checked = true || "";
    IHCMarker_ovry();
    document.getElementById("IHC_Description_ovry").value = mdData.ihcd || "";

    if (mdData.gt) document.querySelector(`input[name="GeneticT_ovry"][value="${mdData.gt}"]`).checked = true || "";
    GeneticT_ovry();
    document.getElementById("gtr_ovry").value = mdData.gtr || "";
    document.getElementById("gtrPositiveType_ovry").value = mdData.gtrP || "";
    document.getElementById("hrd_ovry").value = mdData.hrd || "";
    document.getElementById("brca_ngs_ovry").value = mdData.brca || "";
    document.getElementById("GT_Description_ovry").value = mdData.gtd || "";

    document.getElementById("sInte_ovry").value = mdData.si || "";
    document.querySelectorAll('input[name="histologicType_ovry"]').forEach((checkbox) => {
      checkbox.checked = false;

      const targetId = checkbox.getAttribute("data-toggle-target");
      if (targetId) {
        const targetInput = document.getElementById(targetId);
        if (targetInput) {
          targetInput.value = "";
          targetInput.disabled = true;
        }
      }
    });

    if (Array.isArray(mdData.pst)) {
      mdData.pst.forEach((item) => {
        const optionValue = item?.op || item;
        const checkbox = document.querySelector(`input[name="histologicType_ovry"][value="${optionValue}"]`);

        if (checkbox) {
          checkbox.checked = true || "";
          checkbox.dispatchEvent(new Event("change"));

          const targetId = checkbox.getAttribute("data-toggle-target");
          if (targetId && item?.text) {
            const targetInput = document.getElementById(targetId);
            if (targetInput) {
              targetInput.value = item.text;
            }
          }
        }
      });
    } else if (mdData.pst) {
      const checkbox = document.querySelector(`input[name="histologicType_ovry"][value="${mdData.pst}"]`);
      if (checkbox) {
        checkbox.checked = true || "";
        checkbox.dispatchEvent(new Event("change"));
      }
    }

    document.getElementById("sampleGrade_ovry").value = mdData.gd || "";
    document.getElementById("sampleGradeExplain_ovry").value = mdData.gdOther || "";

    document.getElementById("osi_ovry").value = mdData?.osi || "";
    document.getElementById("osiExplain_ovry").value = mdData?.osiOth || "";
    document.getElementById("ftsi_ovry").value = mdData?.ftsi || "";
    document.getElementById("ftsiExplain_ovry").value = mdData?.ftsiOth || "";
    document.getElementById("ftstici_ovry").value = mdData?.ftstici || "";
    document.getElementById("imp_ovry").value = mdData?.imp || "";
    document.getElementById("impExplain_ovry").value = mdData?.impoth || "";

    document.querySelectorAll('input[name="ot_ovry"]').forEach((checkbox) => {
      checkbox.checked = false;

      const targetId = checkbox.getAttribute("data-toggle-target");
      if (targetId) {
        const targetInput = document.getElementById(targetId);
        if (targetInput) {
          targetInput.value = "";
          targetInput.disabled = true;
        }
      }
    });

    if (Array.isArray(mdData.ot)) {
      mdData.ot.forEach((item) => {
        const optionValue = item?.op || item;
        const checkbox = document.querySelector(`input[name="ot_ovry"][value="${optionValue}"]`);

        if (checkbox) {
          checkbox.checked = true || "";
          checkbox.dispatchEvent(new Event("change"));

          const targetId = checkbox.getAttribute("data-toggle-target");
          if (targetId && item?.text) {
            const targetInput = document.getElementById(targetId);
            if (targetInput) {
              targetInput.value = item.text;
            }
          }
        }
      });
    } else if (mdData.ot) {
      const checkbox = document.querySelector(`input[name="ot_ovry"][value="${mdData.ot}"]`);
      if (checkbox) {
        checkbox.checked = true || "";
        checkbox.dispatchEvent(new Event("change"));
      }
    }
    document.getElementById("lep_ovry").value = mdData?.lep || "";
    document.getElementById("lepExplain_ovry").value = mdData?.lepOth || "";
    document.getElementById("pafi_ovry").value = mdData?.pafi || "";
    document.getElementById("pafiExplain_ovry").value = mdData?.pafiOth || "";
    document.getElementById("pfi_ovry").value = mdData?.pfi || "";
    document.getElementById("pfiExplain_ovry").value = mdData?.pfiOth || "";

    if (mdData.lvi) document.querySelector(`input[name="LVI_ovry"][value="${mdData.lvi}"]`).checked = true || "";
    document.getElementById("pTNM_ovry").value = mdData.ptnm || "";

    document.getElementById("ihc_p53_ovry").value = mdData?.ihcp53 || "";
    document.getElementById("biopsy_hpe_number_ovry").value = mdData?.biopsy || "";
    document.getElementById("surgery_hpe_number_ovry").value = mdData?.surHpe || "";
    document.getElementById("biopsy_date_ovry").value = mdData?.bish || "";
    document.getElementById("surgery_date_ovry").value = mdData?.surD || "";

    if (mdData?.mra) document.querySelector(`input[name="mutation_report_available_ovry"][value="${mdData?.mra}"]`).checked = true || "";
    document.getElementById("biopsy_site_ovry").value = mdData?.bioS || "";
    document.getElementById("biopsy_diagnosis_ovry").value = mdData?.bioD || "";

    if (mdData.as) {
      const { ajcc1, ajcc2 } = splitFigo(mdData.as, "FIGO1_ovry_2021");
      console.log({ ajcc1, ajcc2 });
      const figoStageEndm = document.getElementById("FIGO1_ovry_2021");
      const figoSubStageEndm = document.getElementById("FIGO2_ovry_2021");

      if (figoStageEndm && figoSubStageEndm) {
        figoStageEndm.value = ajcc1 || "";
        figoStageEndm.dispatchEvent(new Event("change"));
        figoSubStageEndm.value = ajcc2 || "";
      }
    }
    if (mdData.as1) {
      const { ajcc1, ajcc2 } = splitFigo(mdData.as1, "FIGO1_ovry_2014");
      console.log({ ajcc1, ajcc2 });
      const figoStageEndm = document.getElementById("FIGO1_ovry_2014");
      const figoSubStageEndm = document.getElementById("FIGO2_ovry_2014");

      if (figoStageEndm && figoSubStageEndm) {
        figoStageEndm.value = ajcc1 || "";
        figoStageEndm.dispatchEvent(new Event("change"));
        figoSubStageEndm.value = ajcc2 || "";
      }
    }
    document.getElementById("nodesTested_ovry").value = mdData?.nnt || "";
    document.getElementById("positiveNodes_ovry").value = mdData?.npn || "";
    document.getElementById("nodesTested_pa_ovry").value = mdData?.pant || "";
    document.getElementById("positiveNodes_pa_ovry").value = mdData?.ppan || "";
    document.getElementById("largestDeposit_ovry").value = mdData?.sld || "";

    if (mdData.tsz) {
      const [tL, tW, tH] = mdData.tsz.split(/[xX]/);
      document.getElementById("tumorSizeL_ovry").value = tL !== undefined ? tL : "";
      document.getElementById("tumorSizeW_ovry").value = tW !== undefined ? tW : "";
      document.getElementById("tumorSizeH_ovry").value = tH !== undefined ? tH : "";
    }

    if (mdData.act) document.querySelector(`input[name="ACT_ovry"][value="${mdData.act}"]`).checked = true || "";
    actYes_ovry();
    document.getElementById("actDrugCycles_ovry").value = mdData.actdc || "";
    document.getElementById("actDateLastCycle_ovry").value = mdData.actdls || "";

    // need to add
    if (mdData.lc) {
      for (let i = 0; i < mdData.lc.length; i++) {
        document.querySelector(`input[name="LC_ovry"][value="${mdData.lc[i]}"]`).checked = true || "";
      }
    }
    document.getElementById("hipecDrugCycles_ovry").value = mdData?.hipec || "";
    document.getElementById("hipecDateLastCycle_ovry").value = mdData?.hipecD || "";
    document.getElementById("nipecDrugCycles_ovry").value = mdData?.nipec || "";
    document.getElementById("nipecDateLastCycle_ovry").value = mdData?.nipecD || "";
    document.getElementById("pidacDrugCycles_ovry").value = mdData?.pidacD || "";
    document.getElementById("pciScore_ovry").value = mdData?.pci || "";

    if (mdData.pidac) document.querySelector(`input[name="PIDAC_ovry"][value="${mdData.pidac}"]`).checked = true || "";

    if (mdData.rd) document.querySelector(`input[name="RadioT_ovry"][value="${mdData.rd}"]`).checked = true || "";
    RadioTYes_ovry();
    document.getElementById("rtDetails1_ovry").value = mdData.rdd1 || "";
    document.getElementById("rtDetails2_ovry").value = mdData.rdd2 || "";
    document.getElementById("rtDetails3_ovry").value = mdData.rdd3 || "";
    document.getElementById("radiotherapyLastCycleDate_ovry").value = mdData.rtdls || "";

    if (mdData.hrt) document.querySelector(`input[name="horT_ovry"][value="${mdData.hrt}"]`).checked = true || "";
    document.getElementById("hormone_Cycles_ovry").value = mdData.hrtD || "";

    if (mdData.trt) document.querySelector(`input[name="tarT_ovry"][value="${mdData.trt}"]`).checked = true || "";
    document.getElementById("Tar_Cycles_ovry").value = mdData.trtD || "";

    if (mdData.parp) document.querySelector(`input[name="PARP_ovry"][value="${mdData.parp}"]`).checked = true || "";
    parpYes_ovry();
    document.getElementById("parpDrugCycles_ovry").value = mdData.parpdc || "";
    document.getElementById("parpDateLastCycle_ovry").value = mdData.parpls || "";

    if (mdData.ipba) document.querySelector(`input[name="pbT_ovry"][value="${mdData.ipba}"]`).checked = true || "";
    document.getElementById("PBInput_ovry").value = mdData.ipbainfo || "";

    document.getElementById("mddataEB_ovry").value = mdData.mdu || "";

    const comorbidityEntries = mdData.cm && typeof mdData.cm === "object" ? Object.values(mdData.cm).filter(Boolean) : [];
    if (comorbidityEntries.length > 0) {
      let comMed = mdData.cm;
      const dropdownContainer = document.getElementById("cvSym_ovry");
      const comorbidityYes = document.getElementById("ECH1_ovry");

      if (comorbidityYes && !comorbidityYes.checked) {
        comorbidityYes.checked = true || "";
      }

      if (dropdownContainer) {
        dropdownContainer.style.display = "";
      }

      const commandClass = "cmd_ovry";

      Object.keys(comMed).forEach((info) => {
        const data = comMed[info];

        const newDiv = document.createElement("div");
        const newDiv1 = document.createElement("div");
        const newDiv2 = document.createElement("div");

        newDiv.classList.add("col-sm-3", "mt-2", commandClass);
        newDiv1.classList.add("col-sm-8", "mt-2", commandClass);
        newDiv2.classList.add("col-sm-1", "mt-2", "pr-4", commandClass);
        const newSelect = document.createElement("select");
        const inputWrapper = document.createElement("div"); // This holds one or two inputs
        inputWrapper.classList.add("form-row");

        newSelect.classList.add("form-control");

        const options = [
          { value: "", text: "Select" },
          { value: "Diabetic", text: "Type 2 Diabetic Mellitus" },
          { value: "Cardiac", text: "Cardiac History" },
          { value: "Hypertension", text: "Hypertension" },
          { value: "IVFR", text: "IVF/Assisted Reprduction" },
          { value: "PCOS", text: "PCOS" },
          { value: "endm", text: "Endometriosis" },
          { value: "Hypothyroid", text: "Hypothyroid" },
          { value: "Other", text: "Other" },
        ];

        options.forEach((optionData) => {
          const option = document.createElement("option");
          option.value = optionData.value;
          option.textContent = optionData.text;
          if (optionData.value === data.selectedOption) {
            option.selected = true;
          }
          newSelect.appendChild(option);
        });
        if (data.selectedOption === "Other") {
          const otherInput1 = document.createElement("input");
          const otherInput2 = document.createElement("input");

          otherInput1.classList.add("form-control", "col-sm-6", "OtherInput1");
          otherInput2.classList.add("form-control", "col-sm-6", "OtherInput2");

          otherInput1.type = "text";
          otherInput2.type = "text";

          otherInput1.placeholder = "Comorbidity";
          otherInput2.placeholder = "Medicines";

          otherInput1.value = data.textValue.input1 || "";
          otherInput2.value = data.textValue.input2 || "";

          inputWrapper.appendChild(otherInput1);
          inputWrapper.appendChild(otherInput2);
        } else {
          const defaultInput = document.createElement("input");
          defaultInput.classList.add("form-control");
          defaultInput.type = "text";
          defaultInput.placeholder = "Medicines";
          defaultInput.value = data.textValue || "";
          inputWrapper.appendChild(defaultInput);
        }

        newDiv2.style.display = "flex";
        newDiv2.style.flexDirection = "row-reverse";
        const imgGroup = document.createElement("div");
        imgGroup.classList.add("input-group-append");

        const img1 = document.createElement("img");
        img1.src = "assets/images/delete-2.svg";
        img1.id = "cvSymRemBtn";
        img1.style.height = "36px";
        img1.style.width = "36px";
        img1.style.marginTop = "-2px";
        img1.style.cursor = "pointer";
        img1.addEventListener("click", function () {
          dropdownContainer.removeChild(newDiv);
          dropdownContainer.removeChild(newDiv1);
          dropdownContainer.removeChild(newDiv2);
        });

        imgGroup.appendChild(img1);

        newDiv.appendChild(newSelect);
        newDiv1.appendChild(inputWrapper);
        newDiv2.appendChild(imgGroup);

        dropdownContainer.appendChild(newDiv);
        dropdownContainer.appendChild(newDiv1);

        if (mode === "SearchView" || mode === "PendingView") {
          const inputs = dropdownContainer.querySelectorAll("input, select");
          inputs.forEach((input) => (input.disabled = true));
        }

        if (mode !== "SearchView" && mode !== "PendingView") {
          dropdownContainer.appendChild(newDiv2);
        }
        newSelect.addEventListener("change", function () {
          inputWrapper.innerHTML = "";

          if (this.value === "Other") {
            const otherInput1 = document.createElement("input");
            const otherInput2 = document.createElement("input");

            otherInput1.classList.add("form-control", "col-sm-6", "OtherInput1");
            otherInput2.classList.add("form-control", "col-sm-6", "OtherInput2");

            otherInput1.value = data.input1 || "";
            otherInput2.value = data.input2 || "";

            inputWrapper.appendChild(otherInput1);
            inputWrapper.appendChild(otherInput2);
          } else {
            const defaultInput = document.createElement("input");
            defaultInput.classList.add("form-control");
            defaultInput.type = "text";
            defaultInput.placeholder = "Medicines";
            inputWrapper.appendChild(defaultInput);
          }
        });
      });
    }
    ExistComorbidity_ovry();
  } catch (e) {
    console.error("Error in filling radio buttons:", e);
  }
}
// Cervix
function fillMdForm_ceix(mdData) {
  function isReadOnlyViewMode(mode) {
    return ["SearchView", "PendingView", "pendingView", "SearchEdit", "PendingEdit", "ViewFollowUp", "SharedView", "sharedView", "share", "view", "edit"].includes(mode);
  }

  function setSubtypeCeix(data) {
    // 1. Reset everything
    document.querySelectorAll('input[name="pSubtype_ceix"]').forEach((cb) => (cb.checked = false));
    const mode = localStorage.getItem("mode");
    const otherInput = document.getElementById("pSubtypeOther_ceix");
    if (otherInput) {
      otherInput.value = "";
      otherInput.disabled = true;
      otherInput.style.display = "none";
    }

    // 2. Apply values
    data.forEach((item) => {
      const cb = document.querySelector(`input[name="pSubtype_ceix"][value="${item.op}"]`);

      if (!cb) return;

      cb.checked = true || "";

      // Handle "Other"
      if (item.op === "op21") {
        if (otherInput) {
          otherInput.style.display = "block";
          otherInput.disabled = isReadOnlyViewMode(mode);

          if (item.text) {
            otherInput.value = item.text;
          }
        }
      }
    });
  }
  function setTumorSiteCeix(data) {
    // 1. Reset all checkboxes
    document.querySelectorAll('input[name="tumorSite_ceix"]').forEach((cb) => (cb.checked = false));
    const mode = localStorage.getItem("mode");

    // Reset "Other" input
    const otherInput = document.getElementById("tumorOtherSpecify_ceix");
    if (otherInput) {
      otherInput.value = "";
      otherInput.disabled = true;
    }

    // 2. Apply values
    data.forEach((item) => {
      const cb = document.querySelector(`input[name="tumorSite_ceix"][value="${item.op}"]`);

      if (!cb) return;

      cb.checked = true || "";

      // Handle "Other"
      if (item.op === "O") {
        if (otherInput) {
          otherInput.disabled = isReadOnlyViewMode(mode);

          if (item.text) {
            otherInput.value = item.text;
          }
        }
      }
    });
  }
  try {
    const formElements = [...document.querySelectorAll("input, select, textarea")];
    let mode = localStorage.getItem("mode");

    if (mdData.fhc) document.querySelector(`input[name="RadioFHabit_ceix"][value="${mdData.fhc}"]`).checked = true || "";
    familyHabitToggle_ceix();
    document.getElementById("familyRelation_ceix").value = mdData.fhcr || "";
    document.getElementById("familyCancerType_ceix").value = mdData.fhct || "";

    document.getElementById("ageAtMarriage_ceix").value = mdData.aam || "";
    document.getElementById("ageAtFirstCoitus_ceix").value = mdData.afc || "";
    document.getElementById("ageOfFirstChildbirth_ceix").value = mdData.afb || "";

    if (mdData.fh) document.querySelector(`input[name="RadioFdHabit_ceix"][value="${mdData.fh}"]`).checked = true || "";
    if (mdData.hac) document.querySelector(`input[name="RadioAlcoholHabit_ceix"][value="${mdData.hac}"]`).checked = true || "";
    if (mdData.hs) document.querySelector(`input[name="RadioSmokeHabit_ceix"][value="${mdData.hs}"]`).checked = true || "";
    if (mdData.ec) document.querySelector(`input[name="ECH_ceix"][value="${mdData.ec}"]`).checked = true || "";

    document.getElementById("ffQcComments_ceix").value = mdData.ffqc || "";
    document.getElementById("ffTissueRemarks_ceix").value = mdData.ftr || "";

    if (mdData.tst) setTumorSiteCeix(mdData.tst);
    document.getElementById("tumorPercentage_ceix").value = mdData.tp || "";
    document.getElementById("ageAtDiagnosis_ceix").value = mdData.ad || "";
    document.getElementById("clinicalStage_ceix").value = mdData.cs || "";
    document.getElementById("HRHPV_ceix").value = mdData.hrhpv || "";

    if (mdData.ihcm) document.querySelector(`input[name="IHC_ceix"][value="${mdData.ihcm}"]`).checked = true || "";
    IHCMarker_ceix();
    document.getElementById("IHC_Description_ceix").value = mdData.ihcd || "";

    if (mdData.gt) document.querySelector(`input[name="GeneticT_ceix"][value="${mdData.gt}"]`).checked = true || "";
    GeneticT_ceix();
    document.getElementById("gtr_ceix").value = mdData.gtr || "";
    document.getElementById("GT_Description_ceix").value = mdData.gtd || "";

    if (mdData.pst) setSubtypeCeix(mdData.pst);
    document.getElementById("pSubtypeOther_ceix").value = mdData.pstOt || "";

    document.getElementById("sampleGrade_ceix").value = mdData.gd || "";
    document.getElementById("sampleGrade_specify_ceix").value = mdData?.gdOther || "";

    document.getElementById("dsi_ceix").value = mdData?.dsi || "";

    if (mdData.spoi) document.querySelector(`input[name="SPI_ceix"][value="${mdData?.spoi}"]`).checked = true || "";

    if (mdData.ot) document.querySelector(`input[name="ot_ceix"][value="${mdData?.ot}"]`).checked = true || "";
    document.getElementById("ot_specify_ceix").value = mdData?.otOther || "";

    if (mdData.lvi) document.querySelector(`input[name="LVI_ceix"][value="${mdData.lvi}"]`).checked = true || "";

    if (mdData.msic) document.querySelector(`input[name="msic_ceix"][value="${mdData.msic}"]`).checked = true || "";
    document.getElementById("msic_loc_ceix").value = mdData?.msicL || "";
    document.getElementById("msic_dlc_ceix").value = mdData?.msicD || "";
    document.getElementById("msic_involved_ceix").value = mdData?.msicI || "";

    if (mdData.ms) document.querySelector(`input[name="ms_hsil_ais_ceix"][value="${mdData.ms}"]`).checked = true || "";
    document.getElementById("ms_hsil_ais_loc_ceix").value = mdData?.msL || "";
    document.getElementById("ms_hsil_ais_dlc_ceix").value = mdData?.msD || "";
    document.getElementById("ms_hsil_ais_involved_ceix").value = mdData?.msI || "";

    document.getElementById("pTNM_ceix").value = mdData.ptnm || "";
    document.getElementById("FIGO_ceix").value = mdData.as || "";

    document.getElementById("nodesTested_ceix").value = mdData?.nnt || "";
    document.getElementById("positiveNodes_ceix").value = mdData?.npn || "";
    document.getElementById("nodesTested_pa_ceix").value = mdData?.pant || "";
    document.getElementById("positiveNodes_pa_ceix").value = mdData?.ppan || "";

    if (mdData.tsz) {
      const [tL, tW, tH] = mdData.tsz.split(/[xX]/);

      document.getElementById("tumorSizeL_ceix").value = tL !== undefined ? tL : "";
      document.getElementById("tumorSizeW_ceix").value = tW !== undefined ? tW : "";
      document.getElementById("tumorSizeH_ceix").value = tH !== undefined ? tH : "";
    }

    if (mdData.act) document.querySelector(`input[name="ACT_ceix"][value="${mdData.act}"]`).checked = true || "";
    actYes_ceix();
    document.getElementById("actDrugCycles_ceix").value = mdData.actdc || "";
    document.getElementById("actDateLastCycle_ceix").value = mdData.actdls || "";

    if (mdData.rd) document.querySelector(`input[name="RadioT_ceix"][value="${mdData.rd}"]`).checked = true || "";
    RadioTYes_ceix();
    document.getElementById("rtDetails1_ceix").value = mdData.rdd1 || "";
    document.getElementById("rtDetails2_ceix").value = mdData.rdd2 || "";
    document.getElementById("rtDetails3_ceix").value = mdData.rdd3 || "";
    document.getElementById("radiotherapyLastCycleDate_ceix").value = mdData.rtdls || "";

    if (mdData.trt) document.querySelector(`input[name="tarT_ceix"][value="${mdData.trt}"]`).checked = true || "";
    tarTYes_ceix();
    document.getElementById("Tar_Cycles_ceix").value = mdData.trtD || "";

    if (mdData.ipba) document.querySelector(`input[name="pbT_ceix"][value="${mdData.ipba}"]`).checked = true || "";
    pbYes_ceix();
    document.getElementById("PBInput_ceix").value = mdData.ipbainfo || "";
    document.getElementById("mddataEB_ceix").value = mdData.mdu || "";

    const comorbidityEntries = mdData.cm && typeof mdData.cm === "object" ? Object.values(mdData.cm).filter(Boolean) : [];
    if (comorbidityEntries.length > 0) {
      let comMed = mdData.cm;
      const dropdownContainer = document.getElementById("cvSym_ceix");
      const comorbidityYes = document.getElementById("ECH1_ceix");

      if (comorbidityYes && !comorbidityYes.checked) {
        comorbidityYes.checked = true || "";
      }

      if (dropdownContainer) {
        dropdownContainer.style.display = "";
      }

      const commandClass = "cmd_ceix";

      Object.keys(comMed).forEach((info) => {
        const data = comMed[info];

        const newDiv = document.createElement("div");
        const newDiv1 = document.createElement("div");
        const newDiv2 = document.createElement("div");

        newDiv.classList.add("col-sm-3", "mt-2", commandClass);
        newDiv1.classList.add("col-sm-8", "mt-2", commandClass);
        newDiv2.classList.add("col-sm-1", "mt-2", "pr-4", commandClass);
        const newSelect = document.createElement("select");
        const inputWrapper = document.createElement("div"); // This holds one or two inputs
        inputWrapper.classList.add("form-row");

        newSelect.classList.add("form-control");

        const options = [
          { value: "", text: "Select" },
          { value: "Diabetic", text: "Type 2 Diabetic Mellitus" },
          { value: "Cardiac", text: "Cardiac History" },
          { value: "Hypertension", text: "Hypertension" },
          { value: "Other", text: "Other" },
        ];

        options.forEach((optionData) => {
          const option = document.createElement("option");
          option.value = optionData.value;
          option.textContent = optionData.text;
          if (optionData.value === data.selectedOption) {
            option.selected = true;
          }
          newSelect.appendChild(option);
        });
        if (data.selectedOption === "Other") {
          const otherInput1 = document.createElement("input");
          const otherInput2 = document.createElement("input");

          otherInput1.classList.add("form-control", "col-sm-6", "OtherInput1");
          otherInput2.classList.add("form-control", "col-sm-6", "OtherInput2");

          otherInput1.type = "text";
          otherInput2.type = "text";

          otherInput1.placeholder = "Comorbidity";
          otherInput2.placeholder = "Medicines";

          otherInput1.value = data.textValue.input1 || "";
          otherInput2.value = data.textValue.input2 || "";

          inputWrapper.appendChild(otherInput1);
          inputWrapper.appendChild(otherInput2);
        } else {
          const defaultInput = document.createElement("input");
          defaultInput.classList.add("form-control");
          defaultInput.type = "text";
          defaultInput.placeholder = "Medicines";
          defaultInput.value = data.textValue || "";
          inputWrapper.appendChild(defaultInput);
        }

        newDiv2.style.display = "flex";
        newDiv2.style.flexDirection = "row-reverse";
        const imgGroup = document.createElement("div");
        imgGroup.classList.add("input-group-append");

        const img1 = document.createElement("img");
        img1.src = "assets/images/delete-2.svg";
        img1.id = "cvSymRemBtn";
        img1.style.height = "36px";
        img1.style.width = "36px";
        img1.style.marginTop = "-2px";
        img1.style.cursor = "pointer";
        img1.addEventListener("click", function () {
          dropdownContainer.removeChild(newDiv);
          dropdownContainer.removeChild(newDiv1);
          dropdownContainer.removeChild(newDiv2);
        });

        imgGroup.appendChild(img1);

        newDiv.appendChild(newSelect);
        newDiv1.appendChild(inputWrapper);
        newDiv2.appendChild(imgGroup);

        dropdownContainer.appendChild(newDiv);
        dropdownContainer.appendChild(newDiv1);

        if (mode === "SearchView" || mode === "PendingView") {
          const inputs = dropdownContainer.querySelectorAll("input, select");
          inputs.forEach((input) => (input.disabled = true));
        }

        if (mode !== "SearchView" && mode !== "PendingView") {
          dropdownContainer.appendChild(newDiv2);
        }
        newSelect.addEventListener("change", function () {
          inputWrapper.innerHTML = "";

          if (this.value === "Other") {
            const otherInput1 = document.createElement("input");
            const otherInput2 = document.createElement("input");

            otherInput1.classList.add("form-control", "col-sm-6", "OtherInput1");
            otherInput2.classList.add("form-control", "col-sm-6", "OtherInput2");

            otherInput1.value = data.input1 || "";
            otherInput2.value = data.input2 || "";

            inputWrapper.appendChild(otherInput1);
            inputWrapper.appendChild(otherInput2);
          } else {
            const defaultInput = document.createElement("input");
            defaultInput.classList.add("form-control");
            defaultInput.type = "text";
            defaultInput.placeholder = "Medicines";
            inputWrapper.appendChild(defaultInput);
          }
        });
      });
    }
    ExistComorbidity_ceix();
  } catch (e) {
    console.error("Error in filling radio buttons:", e);
  }
}
function fillBrfForm(brfData) {
  try {
    document.getElementById("ageAtMenarche").value = brfData.am || "";
    document.getElementById("parity").value = brfData.pty || "";
    parity();
    document.getElementById("numChild").value = brfData.noc || "";
    document.getElementById("ageAtFirstChild").value = brfData.afc || "";
    if (brfData.bf) document.querySelector(`input[name="breFd"][value="${brfData.bf}"]`).checked = true || "";

    if (brfData.ms) document.querySelector(`input[name="mStatus"][value="${brfData.ms}"]`).checked = true || "";

    if (brfData.er) document.querySelector(`input[name="ERRadio"][value="${brfData.er}"]`).checked = true || "";

    if (brfData.pr) document.querySelector(`input[name="PRRadio"][value="${brfData.pr}"]`).checked = true || "";

    if (brfData.h2) document.querySelector(`input[name="HER2Radio"][value="${brfData.h2}"]`).checked = true || "";

    document.getElementById("dbf").value = brfData.dbf || "";
    document.getElementById("sbt").value = brfData.sbt || "";
    document.getElementById("pcsm").value = brfData.pcsm || "";
    document.getElementById("pcvm").value = brfData.pcvm || "";
    document.getElementById("k67").value = brfData.k67 || "";
    document.getElementById("HistologicalS").value = brfData.ht || "";
    document.getElementById("sps").value = brfData.sps || "";
    document.getElementById("brfdataEB").value = brfData.brfu || "";
  } catch (e) {
    console.error("Error in filling brf radio buttons:", e);
  }
}
function fillBrfForm_endm(brfData) {
  try {
    document.getElementById("ageAtMenarche_endm").value = brfData.am || "";
    document.getElementById("parity_endm").value = brfData.pty || "";
    parity_endm();
    document.getElementById("numChild_endm").value = brfData.noc || "";

    if (brfData.ms) document.querySelector(`input[name="mStatus_endm"][value="${brfData.ms}"]`).checked = true || "";

    if (brfData.er) document.querySelector(`input[name="ERRadio_endm"][value="${brfData.er}"]`).checked = true || "";

    if (brfData.pr) document.querySelector(`input[name="PRRadio_endm"][value="${brfData.pr}"]`).checked = true || "";

    document.getElementById("pole_endm").value = brfData.pole || "";
    document.getElementById("mmr_endm").value = brfData.mmr || "";
    document.getElementById("p53_endm").value = brfData.p53 || "";
    document.getElementById("beta_catenin_endm").value = brfData.betaC || "";
    document.getElementById("others_endm").value = brfData.oth || "";

    document.getElementById("pcsm_endm").value = brfData.pcsm || "";
    document.getElementById("pcvm_endm").value = brfData.pcvm || "";
    document.getElementById("k67_endm").value = brfData.k67 || "";

    document.getElementById("brfdataEB_endm").value = brfData.brfu || "";
  } catch (e) {
    console.error("Error in filling brf radio buttons:", e);
  }
}
function fillBrfForm_ovry(brfData) {
  try {
    document.getElementById("ageAtMenarche_ovry").value = brfData.am || "";
    document.getElementById("parity_ovry").value = brfData.pty || "";
    parity_ovry();
    document.getElementById("numChild_ovry").value = brfData.noc || "";

    if (brfData.bf) document.querySelector(`input[name="breFd_ovry"][value="${brfData.bf}"]`).checked = true || "";
    breFd_ovry();
    document.getElementById("dbf_ovry").value = brfData.dbf || "";

    if (brfData.ms) document.querySelector(`input[name="mStatus_ovry"][value="${brfData.ms}"]`).checked = true || "";

    document.getElementById("ca_125_D_ovry").value = brfData.caD || "";
    document.getElementById("ca_125_P_ovry").value = brfData.caP || "";
    document.getElementById("ca_125_FU_ovry").value = brfData.caFU || "";
    document.getElementById("ca_125_O_ovry").value = brfData.caO || "";
    document.getElementById("ihc_ovry").value = brfData.ihc || "";
    document.getElementById("pcsm_ovry").value = brfData.pcsm || "";
    document.getElementById("pcvm_ovry").value = brfData.pcvm || "";
    document.getElementById("k67_ovry").value = brfData.k67 || "";
    document.getElementById("brfdataEB_ovry").value = brfData.brfu || "";
  } catch (e) {
    console.error("Error in filling brf radio buttons:", e);
  }
}
function fillBrfForm_ceix(brfData) {
  try {
    document.getElementById("ageAtMenarche_ceix").value = brfData.am || "";
    document.getElementById("parity_ceix").value = brfData.pty || "";
    parity_ceix();
    document.getElementById("numChild_ceix").value = brfData.noc || "";

    if (brfData.ms) document.querySelector(`input[name="mStatus_ceix"][value="${brfData.ms}"]`).checked = true || "";

    if (brfData.p16) document.querySelector(`input[name="p16IHC_ceix"][value="${brfData.p16}"]`).checked = true || "";

    document.getElementById("other_ihc_ceix").value = brfData.p16Other || "";
    document.getElementById("pcsm_ceix").value = brfData.pcsm || "";
    document.getElementById("pcvm_ceix").value = brfData.pcvm || "";
    document.getElementById("sps_ceix").value = brfData.sps || "";
    document.getElementById("brfdataEB_ceix").value = brfData.brfu || "";
  } catch (e) {
    console.error("Error in filling brf radio buttons:", e);
  }
}

function submitFollowup() {
  event.preventDefault();

  const requiredFields = [{ field: document.querySelector('input[name="flexRadioDefault"]:checked'), name: "livestatus" }, { field: document.querySelector('input[name="livestatus"]:checked') }];

  let allFilled = true;

  requiredFields.forEach((item) => {
    if (!item.field || (item.field.type === "radio" && !item.field.checked) || item.field.value === "") {
      allFilled = false;
    }
  });
  if (allFilled) {
    const lastFollowupStatus = document.querySelector('input[name="flexRadioDefault"]:checked').value;
    const lastFollowUpDate = document.getElementById("startInputFollow").value;
    const othrs = document.getElementById("otherR").value;
    const lostToFollowUpReason = document.getElementById("lostFollowUpinfo") ? document.getElementById("lostFollowUpinfo").value : "";
    const mFollowUpReason = document.getElementById("mFollowUp") ? document.getElementById("mFollowUp").value : "";

    const recurrenceDate = document.getElementById("recurrenceDate") ? document.getElementById("recurrenceDate").value : "";
    const reportedDateForProgressiveDisease = document.getElementById("reportedDate") ? document.getElementById("reportedDate").value : "";
    const vitalStatus = document.querySelector('input[name="livestatus"]:checked').value;
    const treatStatusElement = document.querySelector('input[name="treatStatus"]:checked');
    const treCom = treatStatusElement ? treatStatusElement.value : "";
    const deathDate = document.getElementById("deathDate") ? document.getElementById("deathDate").value : "";
    const petremarks = document.getElementById("PET").value;
    const remarks = document.getElementById("remark").value;
    const bioBankId = localStorage.getItem("bioid");
    const timestamp = new Date().getTime();

    const followupData = {
      lfs: lastFollowupStatus,
      othrs: othrs,
      lfd: lastFollowUpDate,
      rlfw: lostToFollowUpReason || "", // If not provided, set it to an empty string
      mfu: mFollowUpReason || "",
      rd: recurrenceDate || "", // If not provided, set it to an empty string
      rdpd: reportedDateForProgressiveDisease || "", // If not provided, set it to an empty string
      pet: petremarks,
      vs: vitalStatus,
      dd: deathDate || "", // If not provided, set it to an empty string
      tc: treCom,
      rmks: remarks || "", // If not provided, set it to an empty string
      fw_ub: user, // You can dynamically set the field worker's name here
    };

    const db = firebase.database(); // Initialize Firebase database reference
    const dataPath = `Fw/${bioBankId}/${timestamp}`;
    let mode = localStorage.getItem("mode");
    let dus = sessionStorage.getItem("userName");

    let act = {
      mode: "",
      user: dus,
    };
    let lastSection = localStorage.getItem("lastSection");
    db.ref(`act/${bioBankId}/${lastSection}`)
      .set(act)
      .then(() => {
        console.log("New act set, proceeding with pages_display.");
      })
      .catch((error) => {
        console.error("Error setting new act: ", error);
      });
    db.ref(dataPath)
      .set(followupData)
      .then(() => {
        $(sampleInputTab).tab("show");

        console.log("Followup data saved successfully");
      })
      .catch((error) => {
        console.error("Error saving followup data:", error);
      });

    const timePFW = new Date();

    const threeMonthInMinutes = 3 * 30 * 24 * 60; // Approximation of 3 months in minutes
    timePFW.setMinutes(timePFW.getMinutes() + threeMonthInMinutes);

    const selectedStatus = document.querySelector('input[name="livestatus"]:checked').value;
    const lastfollow = document.querySelector('input[name="flexRadioDefault"]:checked').value;

    if (selectedStatus === "Dead" || lastfollow === "Lost_Follow" || lastfollow === "death_Dise" || lastfollow === "death_n_Dise") {
      db.ref(`pfw/${bioBankId}`)
        .remove()
        .then(() => {
          console.log("Data removed from pfw because Vital Status is Dead");
        })
        .catch((error) => {
          console.error("Error removing data from pfw:", error);
        });
    } else {
      db.ref(`pfw/${bioBankId}`)
        .set(timePFW.getTime())
        .then(() => {
          console.log("Stored in pfw");
        })
        .catch((error) => {
          console.error("Error storing in pfw:", error);
        });
    }
  } else if (!allFilled) {
    alert("Please enter all the required fields");
    return;
  }
}

function updateBB(info, field) {
  const parts = info.split("/");

  const bioBankId = document.getElementById("bioBankId").value;

  const boxName = parts[0].trim();
  const seatList = parts[1].split(",").map((seat) => seat.trim());
  const sampleType = parts[2].trim();

  if (!bioBankId) {
    console.error("No bioBankId found in localStorage");
    return;
  }

  db.ref(`bb/${boxName}`)
    .once("value")
    .then((snapshot) => {
      let box = snapshot.val();
      if (!box) {
        console.error(`No box found with the name: ${boxName}`);
        return;
      }

      seatList.forEach((seatID) => {
        let seatIndex = getSeatIndexReverse(seatID);
        const seatUpdate = {
          bioBankId: bioBankId,
          sampleType: sampleType,
          status: "o", // Mark as occupied
        };

        db.ref(`bb/${boxName}/${seatIndex}`)
          .update(seatUpdate)
          .then(() => {
            console.log(`Seat ${seatID} updated successfully to "occupied".`);
          })
          .catch((error) => {
            console.error(`Error updating seat ${seatID}:`, error);
          });
      });
    })
    .catch((error) => {
      console.error("Error fetching seat data from Firebase:", error);
    });
}

function updateRLT(info, field) {
  const parts = info.split("/");

  const bioBankId = document.getElementById("bioBankId").value;

  const boxName = parts[0].trim();
  const seatList = parts[1].split(",").map((seat) => seat.trim());
  const sampleType = parts[2].trim();

  if (!bioBankId) {
    console.error("No bioBankId found in localStorage");
    return;
  }

  db.ref(`rlt/${boxName}`)
    .once("value")
    .then((snapshot) => {
      let box = snapshot.val();
      if (!box) {
        console.error(`No box found with the name: ${boxName}`);
        return;
      }

      seatList.forEach((seatID) => {
        let seatIndex = getSeatIndexReverse(seatID);
        const seatUpdate = {
          bioBankId: bioBankId,
          sampleType: sampleType,
          status: "o", // Mark as occupied
        };

        db.ref(`rlt/${boxName}/${seatIndex}`)
          .update(seatUpdate)
          .then(() => {
            console.log(`Seat ${seatID} updated successfully to "occupied".`);
          })
          .catch((error) => {
            console.error(`Error updating seat ${seatID}:`, error);
          });
      });
    })
    .catch((error) => {
      console.error("Error fetching seat data from Firebase:", error);
    });
}

function updatePC(info, field) {
  const parts = info.split("/");

  const bioBankId = document.getElementById("bioBankId").value;
  console.log("Updating PC with bioBankId:", bioBankId);
  const boxName = parts[0].trim();
  const seatList = parts[1].split(",").map((seat) => seat.trim());
  const sampleType = parts[2].trim();

  if (!bioBankId) {
    console.error("No bioBankId found in localStorage");
    return;
  }

  db.ref(`pcb/${boxName}`)
    .once("value")
    .then((snapshot) => {
      let box = snapshot.val();
      if (!box) {
        console.error(`No box found with the name: ${boxName}`);
        return;
      }

      seatList.forEach((seatID) => {
        let seatIndex = getSeatIndexReverse(seatID);
        const seatUpdate = {
          bioBankId: bioBankId,
          sampleType: sampleType,
          status: "o", // Mark as occupied
        };

        db.ref(`pcb/${boxName}/${seatIndex}`)
          .update(seatUpdate)
          .then(() => {
            console.log("Updating PC with seatUpdate:", seatUpdate);
            console.log(`Seat ${seatID} updated successfully to "occupied".`);
          })
          .catch((error) => {
            console.error(`Error updating seat ${seatID}:`, error);
          });
      });
    })
    .catch((error) => {
      console.error("Error fetching seat data from Firebase:", error);
    });
}
function getSeatIndexReverse(seatID) {
  const rowLetter = seatID[0];
  const colNumber = seatID.slice(1);

  const rows = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

  const rowIndex = rows.indexOf(rowLetter);
  const colIndex = parseInt(colNumber) - 1;

  return rowIndex * 10 + colIndex;
}
function getSeatIndex(seatID) {
  const rowLetter = seatID[0];
  const colNumber = parseInt(seatID.slice(1));

  const rows = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

  const rowIndex = rows.indexOf(rowLetter); // A=0, B=1...
  const colIndex = colNumber - 1; // 1=0, 2=1...

  return rowIndex + colIndex * rows.length;
}

function updateSB(info) {
  const parts = info.split("/");
  if (parts.length !== 3) {
    console.error("Invalid data format. Expected 'box_name/seat_ids/sampleType'.");
    return;
  }

  const bioBankId = document.getElementById("bioBankId").value;

  const boxName = parts[0].trim();
  const seatList = parts[1].split(",");
  const sampleTypes = parts[2].split(",");

  if (!bioBankId) {
    console.error("No bioBankId found in localStorage");
    return;
  }

  db.ref(`sb/${boxName}`)
    .once("value")
    .then((snapshot) => {
      let box = snapshot.val();

      if (!box) {
        console.error(`No box found with the name: ${boxName}`);
        return;
      }

      if (seatList.length !== sampleTypes.length) {
        console.error("The number of seats does not match the number of sample types.");
        return;
      }

      seatList.forEach((seatID, index) => {
        seatID = seatID.trim();
        const sampleType = sampleTypes[index].trim();

        let seatIndex = getSeatIndexReverse(seatID);

        if (box[seatIndex]) {
          const seatUpdate = {
            bioBankId: bioBankId,
            sampleType: sampleType,
            status: "o",
          };

          db.ref(`sb/${boxName}/${seatIndex}`)
            .update(seatUpdate)
            .then(() => {
              console.log(`Seat ${seatID} updated with sample type ${sampleType} successfully in Firebase.`);
            })
            .catch((error) => {
              console.error(`Error updating seat ${seatID}:`, error);
            });
        }
      });
    })
    .catch((error) => {
      console.error("Error fetching seat data from Firebase:", error);
    });
}

let followupDataStore = {};

function retrieveFollowup(bioBankId) {
  const db = firebase.database();
  const dataPath = `Fw/${bioBankId}`;

  document.getElementById("followUpCard").style.display = "block";
  document.getElementById("followForm").style.display = "none";
  db.ref(dataPath)
    .once("value")
    .then((snapshot) => {
      if (snapshot.exists()) {
        const followupData = snapshot.val();
        const container = document.querySelector(".card-followUp-container");
        container.innerHTML = "";

        const timestamps = Object.keys(followupData);
        followupDataStore = followupData;

        timestamps.forEach((timestamp) => {
          const date = new Date(Number(timestamp));

          const istTimestamp = date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

          const cardTemplate = `
            <div class="card-body row" style="justify-content: space-around;">
              <h5 class="card-title">${bioBankId}</h5>
              <p class="card-text">${istTimestamp}</p>
              <a href="#" class="btn btn-primary" onclick="displayFollowupData('${timestamp}')">View</a>
            </div>
          `;

          container.insertAdjacentHTML("beforeend", cardTemplate);
        });
      } else {
        console.log("No follow-up data found for this BioBank ID.");
        const container = document.querySelector(".card-followUp-container");
        container.innerHTML = "<p>No follow up data available.</p>";
      }
    })
    .catch((error) => {
      console.error("Error retrieving follow-up data:", error);
      alert("There was an error retrieving the follow-up information. Please try again.");
    });
}

function displayFollowupData(timestamp) {
  const data = followupDataStore[timestamp];

  document.getElementById("followUpCard").style.display = "none";
  document.getElementById("followForm").style.display = "block";

  document.querySelector(`input[name="flexRadioDefault"][value="${data.lfs}"]`).checked = true || "";
  document.getElementById("otherR").value = data.othrs || "";

  document.getElementById("startInputFollow").value = data.lfd || "";
  document.getElementById("lostFollowUpinfo").value = data.rlfw || "";
  document.getElementById("mFollowUp").value = data.mfu || "";

  document.getElementById("recurrenceDate").value = data.rd || "";
  document.getElementById("reportedDate").value = data.rdpd || "";
  document.getElementById("PET").value = data.pet || "";
  document.querySelector(`input[name="livestatus"][value="${data.vs}"]`).checked = true || "";
  document.querySelector(`input[name="treatStatus"][value="${data.tc}"]`).checked = true || "";
  toggleDeathDate();

  document.getElementById("deathDate").value = data.dd || "";
  document.getElementById("remark").value = data.rmks || "";

  toggleFollowup();
  function toggleFollowup() {
    if ($("#radioOther").is(":checked")) {
      $("#otherText").show();
    } else {
      $("#otherText").hide();
    }
    if ($("#radioRecurrence").is(":checked")) {
      $("#recurID").show();
    } else {
      $("#recurID").hide();
    }
    if ($("#radioLost").is(":checked")) {
      $("#lostFollowUpID").show();
    } else {
      $("#lostFollowUpID").hide();
    }
    if ($("#radioMetastasis").is(":checked")) {
      $("#mFollowUpID").show();
    } else {
      $("#mFollowUpID").hide();
    }
    if ($("#radioDiseasePro").is(":checked")) {
      $("#proDisID").show();
      $("#pmr").show();
    } else {
      $("#proDisID").hide();
      $("#pmr").hide();
    }
  }
}

function shareData(mode, selectedPatients) {
  localStorage.setItem("selectedPatients", JSON.stringify(selectedPatients));
  localStorage.setItem("mode", mode);

  switch (mode) {
    case "share":
      localStorage.setItem("selectedGrid", "");
      window.location.href = `default.html?shared=true`;
      break;
    default:
      console.error("Unknown mode:", mode);
  }
}

function popSharedmodal(bioboxName, samples) {
  function fetchBoxIdFromBN(boxName) {
    return new Promise((resolve, reject) => {
      let dbRef = firebase.database().ref("bn");
      dbRef
        .once("value")
        .then((snapshot) => {
          let boxIDs = snapshot.val();
          const boxEntry = Object.entries(boxIDs).find(([id, name]) => id === boxName);

          if (boxEntry) {
            const [boxId] = boxEntry;
            resolve(boxId);
          } else {
            console.log(`Box name ${boxName} not found in 'bn'.`);
            resolve(null); // Resolve with null if box not found
          }
        })
        .catch((error) => {
          console.error("Error fetching 'bn' data:", error);
          reject(error);
        });
    });
  }
  function fetchSeatDataFromDB(nodeName, boxId) {
    return new Promise((resolve, reject) => {
      let dbRef = firebase.database().ref(`${nodeName}/${boxId}`);
      dbRef
        .once("value")
        .then((snapshot) => {
          let seatData = snapshot.val();
          resolve(seatData);
        })
        .catch((error) => {
          console.error(`Error fetching seat data from '${nodeName}':`, error);
          reject(error);
        });
    });
  }

  fetchBoxIdFromBN(bioboxName)
    .then((boxId) => {
      if (!boxId) {
        console.log(`No box ID found for ${bioboxName}.`);
        return; // Exit if no box ID is found
      }
      fetchSeatDataFromDB("bb", boxId)
        .then((bbData) => {
          if (bbData) {
            popSharedBloodmodal(bioboxName, samples);
          } else {
            console.log(`Box ID ${boxId} not found in 'bb'.`);
          }
        })
        .catch((error) => {
          console.error("Error fetching 'bb' data:", error);
        });
      fetchSeatDataFromDB("sb", boxId)
        .then((sbData) => {
          if (sbData) {
            popSharedSpecimenmodal(bioboxName, samples);
          } else {
            console.log(`Box ID ${boxId} not found in 'sb'.`);
          }
        })
        .catch((error) => {
          console.error("Error fetching 'sb' data:", error);
        });

      fetchSeatDataFromDB("rlt", boxId)
        .then((bbData) => {
          if (bbData) {
            popSharedRLTmodal(bioboxName, samples);
          } else {
            console.log(`Box ID ${boxId} not found in 'bb'.`);
          }
        })
        .catch((error) => {
          console.error("Error fetching 'bb' data:", error);
        });

      fetchSeatDataFromDB("pcb", boxId)
        .then((bbData) => {
          if (bbData) {
            popSharedPCmodal(bioboxName, samples);
          } else {
            console.log(`Box ID ${boxId} not found in 'bb'.`);
          }
        })
        .catch((error) => {
          console.error("Error fetching 'bb' data:", error);
        });
    })
    .catch((error) => {
      console.error("Error fetching box ID from 'bn':", error);
    });
}

validateAndCollectData;

function popSharedBloodmodal(bioboxName, samples) {
  $("#sharedBloodModal").modal("show");

  fetchSeatDataFromDB("bb").then((seatData) => {
    populateBSeats("shared-box", seatData);
  });

  function fetchSeatDataFromDB(nodeName) {
    return new Promise((resolve, reject) => {
      let dbRef = firebase.database().ref(nodeName);
      dbRef
        .once("value")
        .then((snapshot) => {
          let seatData = snapshot.val();
          resolve(seatData);
        })
        .catch((error) => {
          console.error("Error fetching seat data:", error);
          reject(error);
        });
    });
  }

  function populateBSeats(containerClass, seatData) {
    let container = document.querySelector(`.${containerClass}`);
    container.innerHTML = "";

    const rows = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
    const cols = 10;

    let gridSamples = [];
    gridSamples = samples.split(",");
    let activeBoxEntry = [];
    let box_id = [];
    db.ref("bn/")
      .once("value")
      .then((snapshot) => {
        if (snapshot.exists()) {
          const boxIDs = snapshot.val();

          bioInfo = Object.entries(boxIDs).find(([bio_id, boxData]) => bio_id === bioboxName);
          const [id, boxData] = bioInfo;

          box_id = id;

          activeBoxEntry = Object.entries(seatData).find(([boxid, data]) => boxid === box_id);

          if (!activeBoxEntry) {
            console.log("No active box found.");
            return;
          }
          const [boxid, filteredSeats] = activeBoxEntry;
          let boxName = [];

          const indexedSeats = filteredSeats;

          db.ref("bn/" + boxid)
            .once("value")
            .then((snapshot) => {
              if (snapshot.exists()) {
                boxName = snapshot.val();

                document.getElementById("cursharedBloodBox").textContent = boxName;
              } else {
                console.log("No box found with ID " + boxid);
              }
              if (!indexedSeats) {
                console.log("No indexed seats available in the active box.");
                return;
              }
              for (let row = 0; row < rows.length; row++) {
                for (let col = 1; col <= cols; col++) {
                  const labelName = `label_B${rows[row]}${col}`;
                  const seatID = `${rows[row]}${col}`;
                  const index = getColumnMajorIndex(row, col, rows.length);

                  const seat = indexedSeats[index];

                  if (seat) {
                    container.insertAdjacentHTML(
                      "beforeend",
                      `<input type="checkbox" name="seats" id="${seatID}" />` + `<label for="${seatID}" class="viewSeat" id="${labelName}">${labelName}</label>`,
                    );

                    let labelElement = document.getElementById(labelName);
                    if (labelElement) {
                      if (seat.bioBankId !== "") {
                        labelElement.innerHTML = `${seat.bioBankId || ""}<br>${seat.sampleType || ""}`;
                        labelElement.style.fontWeight = "bolder";
                        labelElement.style.fontSize = "9px";
                        labelElement.style.textAlign = "center";
                        labelElement.style.color = "white";
                      } else if (seat.bioBankId === "") {
                        labelElement.innerHTML = `${"-"}<br>`;
                        labelElement.style.color = "rgb(143, 218, 187)";
                        labelElement.style.textAlign = "center";
                      }

                      if (seat.status === "o") {
                        labelElement.style.background = "rgb(129, 129, 192)";
                      } else if (seat.status === "s") {
                        labelElement.style.background = "rgb(180, 180, 180)";
                      } else if (seat.status === "ps") {
                        labelElement.style.background = "rgb(193, 154, 107)";
                      } else if (seat.status === "e") {
                        labelElement.style.background = "rgb(143, 218, 187)";
                        labelElement.style.paddingTop = "6px";
                      }

                      if (gridSamples.includes(seatID)) {
                        labelElement.style.background = "#4d6335";
                      }
                    }
                  }
                }
                container.insertAdjacentHTML("beforeend", "<br/>");
              }
            })

            .catch((error) => {
              console.error("Error fetching box name for ID " + boxid + ": ", error);
            });
        } else {
          console.log("No boxes found in the database.");
        }
      })
      .catch((error) => {
        console.error("Error fetching box names:", error);
      });
  }
}

function popSharedSpecimenmodal(bioboxName, samples) {
  $("#sharedSpecimenModal").modal("show");

  fetchSeatDataFromDB("sb").then((seatData) => {
    populateSSeats("shared-s-box", seatData);
  });

  function fetchSeatDataFromDB(nodeName) {
    return new Promise((resolve, reject) => {
      let dbRef = firebase.database().ref(nodeName);
      dbRef
        .once("value")
        .then((snapshot) => {
          let seatData = snapshot.val();
          resolve(seatData);
        })
        .catch((error) => {
          console.error("Error fetching seat data:", error);
          reject(error);
        });
    });
  }

  function populateSSeats(containerClass, seatData) {
    let container = document.querySelector(`.${containerClass}`);
    container.innerHTML = "";

    const rows = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
    const cols = 10;

    const gridSamples = samples;

    let activeBoxEntry = [];
    let box_id = [];
    db.ref("bn/")
      .once("value")
      .then((snapshot) => {
        if (snapshot.exists()) {
          const boxIDs = snapshot.val();

          bioInfo = Object.entries(boxIDs).find(([bio_id, boxData]) => bio_id === bioboxName);
          const [id, boxData] = bioInfo;
          box_id = id;

          activeBoxEntry = Object.entries(seatData).find(([boxid, data]) => boxid === box_id);

          if (!activeBoxEntry) {
            console.log("No active box found.");
            return;
          }
          const [boxid, filteredSeats] = activeBoxEntry;
          let boxName = [];

          const indexedSeats = filteredSeats;

          db.ref("bn/" + boxid)
            .once("value")
            .then((snapshot) => {
              if (snapshot.exists()) {
                boxName = snapshot.val();

                document.getElementById("cursharedSpecimenBox").textContent = boxName;
              } else {
                console.log("No box found with ID " + boxid);
              }
              if (!indexedSeats) {
                console.log("No indexed seats available in the active box.");
                return;
              }
              for (let row = 0; row < rows.length; row++) {
                for (let col = 1; col <= cols; col++) {
                  const labelName = `label_S${rows[row]}${col}`;
                  const seatID = `${rows[row]}${col}`;
                  const index = getColumnMajorIndex(row, col, rows.length);

                  const seat = indexedSeats[index];

                  if (seat) {
                    container.insertAdjacentHTML(
                      "beforeend",
                      `<input type="checkbox" name="seats" id="${seatID}" />` + `<label for="${seatID}" class="viewSeat" id="${labelName}">${labelName}</label>`,
                    );

                    let labelElement = document.getElementById(labelName);
                    if (labelElement) {
                      if (seat.bioBankId !== "") {
                        labelElement.innerHTML = `${seat.bioBankId || ""}<br>${seat.sampleType || ""}`;
                        labelElement.style.fontWeight = "bolder";
                        labelElement.style.fontSize = "9px";
                        labelElement.style.textAlign = "center";
                        labelElement.style.color = "white";
                      } else if (seat.bioBankId === "") {
                        labelElement.innerHTML = `${"-"}<br>`;
                        labelElement.style.color = "rgb(143, 218, 187)";
                        labelElement.style.textAlign = "center";
                      }

                      if (seat.status === "o") {
                        labelElement.style.background = "rgb(129, 129, 192)";
                      } else if (seat.status === "s") {
                        labelElement.style.background = "rgb(180, 180, 180)";
                      } else if (seat.status === "ps") {
                        labelElement.style.background = "rgb(193, 154, 107)";
                      } else if (seat.status === "e") {
                        labelElement.style.background = "rgb(143, 218, 187)";
                        labelElement.style.paddingTop = "6px";
                      }

                      if (gridSamples.includes(seatID)) {
                        labelElement.style.background = "#4d6335";
                      }
                    }
                  }
                }
                container.insertAdjacentHTML("beforeend", "<br/>");
              }
            })

            .catch((error) => {
              console.error("Error fetching box name for ID " + boxid + ": ", error);
            });
        } else {
          console.log("No boxes found in the database.");
        }
      })
      .catch((error) => {
        console.error("Error fetching box names:", error);
      });
  }
}

function popSharedRLTmodal(bioboxName, samples) {
  $("#sharedRLTModal").modal("show");

  fetchSeatDataFromDB("rlt").then((seatData) => {
    populateBSeats("shared-r-box", seatData);
  });

  function fetchSeatDataFromDB(nodeName) {
    return new Promise((resolve, reject) => {
      let dbRef = firebase.database().ref(nodeName);
      dbRef
        .once("value")
        .then((snapshot) => {
          let seatData = snapshot.val();
          resolve(seatData);
        })
        .catch((error) => {
          console.error("Error fetching seat data:", error);
          reject(error);
        });
    });
  }

  function populateBSeats(containerClass, seatData) {
    let container = document.querySelector(`.${containerClass}`);
    container.innerHTML = "";

    const rows = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
    const cols = 10;

    let gridSamples = [];
    gridSamples = samples.split(",");
    let activeBoxEntry = [];
    let box_id = [];
    db.ref("bn/")
      .once("value")
      .then((snapshot) => {
        if (snapshot.exists()) {
          const boxIDs = snapshot.val();

          bioInfo = Object.entries(boxIDs).find(([bio_id, boxData]) => bio_id === bioboxName);
          const [id, boxData] = bioInfo;

          box_id = id;

          activeBoxEntry = Object.entries(seatData).find(([boxid, data]) => boxid === box_id);

          if (!activeBoxEntry) {
            console.log("No active box found.");
            return;
          }
          const [boxid, filteredSeats] = activeBoxEntry;
          let boxName = [];

          const indexedSeats = filteredSeats;

          db.ref("bn/" + boxid)
            .once("value")
            .then((snapshot) => {
              if (snapshot.exists()) {
                boxName = snapshot.val();

                document.getElementById("cursharedRLTBox").textContent = boxName;
              } else {
                console.log("No box found with ID " + boxid);
              }
              if (!indexedSeats) {
                console.log("No indexed seats available in the active box.");
                return;
              }
              for (let row = 0; row < rows.length; row++) {
                for (let col = 1; col <= cols; col++) {
                  const labelName = `label_R${rows[row]}${col}`;
                  const seatID = `${rows[row]}${col}`;
                  const index = getColumnMajorIndex(row, col, rows.length);

                  const seat = indexedSeats[index];

                  if (seat) {
                    container.insertAdjacentHTML(
                      "beforeend",
                      `<input type="checkbox" name="seats" id="${seatID}" />` + `<label for="${seatID}" class="viewSeat" id="${labelName}">${labelName}</label>`,
                    );

                    let labelElement = document.getElementById(labelName);
                    if (labelElement) {
                      if (seat.bioBankId !== "") {
                        labelElement.innerHTML = `${seat.bioBankId || ""}<br>${seat.sampleType || ""}`;
                        labelElement.style.fontWeight = "bolder";
                        labelElement.style.fontSize = "9px";
                        labelElement.style.textAlign = "center";
                        labelElement.style.color = "white";
                      } else if (seat.bioBankId === "") {
                        labelElement.innerHTML = `${"-"}<br>`;
                        labelElement.style.color = "rgb(143, 218, 187)";
                        labelElement.style.textAlign = "center";
                      }

                      if (seat.status === "o") {
                        labelElement.style.background = "rgb(129, 129, 192)";
                      } else if (seat.status === "s") {
                        labelElement.style.background = "rgb(180, 180, 180)";
                      } else if (seat.status === "ps") {
                        labelElement.style.background = "rgb(193, 154, 107)";
                      } else if (seat.status === "e") {
                        labelElement.style.background = "rgb(143, 218, 187)";
                        labelElement.style.paddingTop = "6px";
                      }

                      if (gridSamples.includes(seatID)) {
                        labelElement.style.background = "#4d6335";
                      }
                    }
                  }
                }
                container.insertAdjacentHTML("beforeend", "<br/>");
              }
            })

            .catch((error) => {
              console.error("Error fetching box name for ID " + boxid + ": ", error);
            });
        } else {
          console.log("No boxes found in the database.");
        }
      })
      .catch((error) => {
        console.error("Error fetching box names:", error);
      });
  }
}

function popSharedPCmodal(bioboxName, samples) {
  $("#sharedPCModal").modal("show");

  fetchSeatDataFromDB("pcb").then((seatData) => {
    populateBSeats("shared-p-box", seatData);
  });

  function fetchSeatDataFromDB(nodeName) {
    return new Promise((resolve, reject) => {
      let dbRef = firebase.database().ref(nodeName);
      dbRef
        .once("value")
        .then((snapshot) => {
          let seatData = snapshot.val();
          resolve(seatData);
        })
        .catch((error) => {
          console.error("Error fetching seat data:", error);
          reject(error);
        });
    });
  }

  function populateBSeats(containerClass, seatData) {
    let container = document.querySelector(`.${containerClass}`);
    container.innerHTML = "";

    const rows = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
    const cols = 10;

    let gridSamples = [];
    gridSamples = samples.split(",");
    let activeBoxEntry = [];
    let box_id = [];
    db.ref("bn/")
      .once("value")
      .then((snapshot) => {
        if (snapshot.exists()) {
          const boxIDs = snapshot.val();

          bioInfo = Object.entries(boxIDs).find(([bio_id, boxData]) => bio_id === bioboxName);
          const [id, boxData] = bioInfo;

          box_id = id;

          activeBoxEntry = Object.entries(seatData).find(([boxid, data]) => boxid === box_id);

          if (!activeBoxEntry) {
            console.log("No active box found.");
            return;
          }
          const [boxid, filteredSeats] = activeBoxEntry;
          let boxName = [];

          const indexedSeats = filteredSeats;

          db.ref("bn/" + boxid)
            .once("value")
            .then((snapshot) => {
              if (snapshot.exists()) {
                boxName = snapshot.val();

                document.getElementById("cursharedPCBox").textContent = boxName;
              } else {
                console.log("No box found with ID " + boxid);
              }
              if (!indexedSeats) {
                console.log("No indexed seats available in the active box.");
                return;
              }
              for (let row = 0; row < rows.length; row++) {
                for (let col = 1; col <= cols; col++) {
                  const labelName = `label_P${rows[row]}${col}`;
                  const seatID = `${rows[row]}${col}`;
                  const index = getColumnMajorIndex(row, col, rows.length);

                  const seat = indexedSeats[index];

                  if (seat) {
                    container.insertAdjacentHTML(
                      "beforeend",
                      `<input type="checkbox" name="seats" id="${seatID}" />` + `<label for="${seatID}" class="viewSeat" id="${labelName}">${labelName}</label>`,
                    );

                    let labelElement = document.getElementById(labelName);
                    if (labelElement) {
                      if (seat.bioBankId !== "") {
                        labelElement.innerHTML = `${seat.bioBankId || ""}<br>${seat.sampleType || ""}`;
                        labelElement.style.fontWeight = "bolder";
                        labelElement.style.fontSize = "9px";
                        labelElement.style.textAlign = "center";
                        labelElement.style.color = "white";
                      } else if (seat.bioBankId === "") {
                        labelElement.innerHTML = `${"-"}<br>`;
                        labelElement.style.color = "rgb(143, 218, 187)";
                        labelElement.style.textAlign = "center";
                      }

                      if (seat.status === "o") {
                        labelElement.style.background = "rgb(129, 129, 192)";
                      } else if (seat.status === "s") {
                        labelElement.style.background = "rgb(180, 180, 180)";
                      } else if (seat.status === "ps") {
                        labelElement.style.background = "rgb(193, 154, 107)";
                      } else if (seat.status === "e") {
                        labelElement.style.background = "rgb(143, 218, 187)";
                        labelElement.style.paddingTop = "6px";
                      }

                      if (gridSamples.includes(seatID)) {
                        labelElement.style.background = "#4d6335";
                      }
                    }
                  }
                }
                container.insertAdjacentHTML("beforeend", "<br/>");
              }
            })

            .catch((error) => {
              console.error("Error fetching box name for ID " + boxid + ": ", error);
            });
        } else {
          console.log("No boxes found in the database.");
        }
      })
      .catch((error) => {
        console.error("Error fetching box names:", error);
      });
  }
}

function retrieveOs(bioBankId) {
  db.ref(`Os/${bioBankId}`)
    .once("value")
    .then((snapshot) => {
      if (snapshot.exists()) {
        const outSourceData = snapshot.val();

        const container = document.querySelector(".card-shared-container");
        container.innerHTML = "";
        Object.keys(outSourceData).forEach((seqNum) => {
          const seqData = outSourceData[seqNum];

          const timestamps = Object.keys(seqData);

          timestamps.forEach((timestamp) => {
            const date = new Date(timestamp * 1000); // Multiply by 1000 if timestamp is in seconds
            const istTimestamp = date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

            const cardTemplate = `
              <div class="card-body row" style="justify-content: space-around;">
                <h5 class="card-title">${bioBankId}</h5>
                <p class="card-text">${istTimestamp}</p>
                <a href="#" class="btn btn-primary" onclick="viewShared('${bioBankId}', ${timestamp})">View</a>
              </div>
            `;
            container.insertAdjacentHTML("beforeend", cardTemplate);
          });
        });
      } else {
        console.log("No OutSource data found for this BioBank ID.");
        const container = document.querySelector(".card-shared-container");
        container.innerHTML = "<p>No OutSource data available.</p>";
      }
    })
    .catch((error) => {
      console.error("Error retrieving OutSource data:", error);
      alert("There was an error retrieving the OutSource information. Please try again.");
    });
}

function viewShared(bioBankId, timestamp) {
  document.getElementById("sharedCard").style.display = "none";
  document.getElementById("shareForm").style.display = "block";

  db.ref(`Os/${bioBankId}`)
    .once("value")
    .then((snapshot) => {
      if (snapshot.exists()) {
        const outSourceData = snapshot.val();

        Object.keys(outSourceData).forEach((seqNum) => {
          const seqData = outSourceData[seqNum];

          const latestData = seqData[timestamp];

          displayOutsourceData(latestData); // Call your custom function to display data
        });
      } else {
        console.log("No OutSource data found for this BioBank ID.");
      }
    })
    .catch((error) => {
      console.error("Error retrieving OutSource data:", error);
      alert("There was an error retrieving the OutSource information. Please try again.");
    });
}

function shared_pages_display(mode, bioBankId, seq, boxName, timestampKey) {
  localStorage.setItem("sharedBox", boxName);

  var dataPath = `Os/${bioBankId}/${seq}/`;

  localStorage.setItem("bioid", bioBankId);
  localStorage.setItem("mode", mode);

  if (mode != "") {
    db.ref(dataPath)
      .once("value")
      .then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();

          sessionStorage.setItem("sharedData", JSON.stringify(data));
          const storedData = sessionStorage.getItem("sharedData");
          if (storedData) {
            const parsedData = JSON.parse(storedData);
          } else {
            console.log("No formData found in sessionStorage");
          }
          switch (mode) {
            case "sharedView":
              localStorage.setItem("selectedGrid", "");
              window.location.href = `default.html?shared=true`;
              break;

            default:
              console.error("Unknown mode:", mode);
          }
        } else {
          console.error("No data found at the specified path");
        }
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  } else if (mode === "") {
    localStorage.setItem("selectedGrid", "");
    window.location.href = "default.html";
  } else if (mode === undefined) {
    const formElements = [...document.querySelectorAll("input, select, textarea")];
  }
}

function follow_pages_display(mode, bioBankId, seq, timestamp) {
  var dataPath = `Fw/${bioBankId}/`;

  localStorage.setItem("bioid", bioBankId);
  localStorage.setItem("mode", mode);

  if (mode != "") {
    db.ref(dataPath)
      .once("value")
      .then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();

          sessionStorage.setItem("FollowData", JSON.stringify(data));
          const storedData = sessionStorage.getItem("FollowData");
          if (storedData) {
            const parsedData = JSON.parse(storedData);
          } else {
            console.log("No formData found in sessionStorage");
          }
          switch (mode) {
            case "ViewFollowUp":
              localStorage.setItem("selectedGrid", "");
              window.location.href = `default.html?mode=view`;
              break;

            default:
              console.error("Unknown mode:", mode);
          }
        } else {
          console.error("No data found at the specified path");
          alert("Follow-Up is not done yet");
        }
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  } else if (mode === "") {
    localStorage.setItem("selectedGrid", "");
    window.location.href = "default.html";
  } else if (mode === undefined) {
    const formElements = [...document.querySelectorAll("input, select, textarea")];
  }
}

function displayOutsourceData(data) {
  document.querySelector(`input[name="sharestatus"][value="${data.ossts}"]`).checked = true || "";
  document.getElementById("startInputOutsource").value = data.doe || "";
  document.getElementById("institute").value = data.dpt || "";
  document.getElementById("projectName").value = data.prj || "";
  document.getElementById("nopi").value = data.pip || ""; // Assuming 'pip' is project leader info
  document.getElementById("parSharedRemark").value = data.psr || "";
  const sharedSampleBox = document.getElementById("sharedSampleBox");
  sharedSampleBox.style.display = "block"; // Make sure it's visible
  sharedSampleBox.innerHTML = ""; // Clear previous content

  if (data.lbi) {
    Object.keys(data.lbi).forEach((childNode) => {
      const childData = data.lbi[childNode];

      if (childData) {
        const formattedSamples = childData;
        const childContent = `${childNode}: ${formattedSamples}`;
        const storedBnData = JSON.parse(localStorage.getItem("bnData"));
        const boxEntry = storedBnData.find((entry) => entry.id === childNode);
        const Boxname = boxEntry.name;
        const sampleButton = `
          <div class="row ml-1 mb-3">
            <label for="sharedSampleBox" class="col-sm-2 mb-1 col-form-label">${Boxname} Grid No.</label>
            <div class="col-sm-10 mt-2">
              <input type="button" class="form-control" value="${formattedSamples}" onclick="popSharedmodal('${childNode}', '${formattedSamples}')">
            </div>
          </div>
        `;
        sharedSampleBox.insertAdjacentHTML("beforeend", sampleButton);
      } else {
        sharedSampleBox.insertAdjacentHTML("beforeend", `<p>${childNode}: ${childData}</p>`);
      }
    });
  } else {
    sharedSampleBox.innerHTML = "No samples available.";
  }

  if (document.querySelector("#radioPartial").checked) {
    document.querySelector("#partialSamples").style.display = "block";
  }
}

function goToTimestampCard() {
  document.getElementById("shareForm").style.display = "none";

  document.getElementById("sharedCard").style.display = "block";
}

function goToFollowCard() {
  document.getElementById("followForm").style.display = "none";

  document.getElementById("followUpCard").style.display = "block";
}
let bnLocalS = [];

function fetchBnData() {
  let bnLocalS = [];

  db.ref("bn/")
    .once("value")
    .then((snapshot) => {
      if (snapshot.exists()) {
        const boxIDs = snapshot.val();

        let bnLocalS = [];

        for (const [key, value] of Object.entries(boxIDs)) {
          bnLocalS.push({ id: key, name: value });
        }
        localStorage.setItem("bnData", JSON.stringify(bnLocalS));
      }
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
    });
}

function showLoadingModal() {
  document.getElementById("loading").style.display = "flex";
  setTimeout(hideLoadingModal, 1000); // 3000 ms = 3 seconds
}

function hideLoadingModal() {
  document.getElementById("loading").style.display = "none";
}

document.addEventListener("DOMContentLoaded", function () {
  const navLinks = document.querySelectorAll(".nav-link");

  navLinks.forEach((link) => {
    link.addEventListener("click", function (event) {
      event.preventDefault(); // Prevent default navigation

      const href = this.getAttribute("href"); // Store the link
      if (!this.classList.contains("disabled")) {
        showLoadingModal(); // Show spinner modal and hide after 3 seconds
      }

      setTimeout(() => {
        window.location.href = href; // Redirect after 3 seconds
      }, 1000);
    });
  });
});

function bloodSample() {
  if ($("#bloodSampleY").is(":checked")) {
    $("#plasmatubes").show();
    $("#serumtubes").show();
    $("#bufferCoatTubes").show();
  } else if ($("#bloodSampleN").is(":checked")) {
    $("#plasmatubes").hide();
    $("#serumtubes").hide();
    $("#bufferCoatTubes").hide();
    $("#PlasmagridNo").val("");
    $("#SerumgridNo").val("");
    $("#bufferCoatgridNo").val("");
  }
}
// Cervix
function bloodsample_ceix() {
  if ($("#bloodSampleY_ceix").is(":checked")) {
    $("#plasmatubes_ceix").show();
    $("#serumtubes_ceix").show();
    $("#bufferCoatTubes_ceix").show();
  } else if ($("#bloodSampleN_ceix").is(":checked")) {
    $("#plasmatubes_ceix").hide();
    $("#serumtubes_ceix").hide();
    $("#bufferCoatTubes_ceix").hide();
    $("#PlasmagridNo_ceix").val("");
    $("#SerumgridNo_ceix").val("");
    $("#bufferCoatgridNo_ceix").val("");
  }
}
// Ovary
function bloodSample_ovry() {
  if ($("#bloodSampleY_ovry").is(":checked")) {
    $("#plasmatubes_ovry").show();
    $("#serumtubes_ovry").show();
    $("#bufferCoatTubes_ovry").show();
  } else if ($("#bloodSampleN_ovry").is(":checked")) {
    $("#plasmatubes_ovry").hide();
    $("#serumtubes_ovry").hide();
    $("#bufferCoatTubes_ovry").hide();
    $("#PlasmagridNo_ovry").val("");
    $("#SerumgridNo_ovry").val("");
    $("#bufferCoatgridNo_ovry").val("");
  }
}
// Endometrium
function bloodSample_endm() {
  if ($("#bloodSampleY_endm").is(":checked")) {
    $("#plasmatubes_endm").show();
    $("#serumtubes_endm").show();
    $("#bufferCoatTubes_endm").show();
  } else if ($("#bloodSampleN_endm").is(":checked")) {
    $("#plasmatubes_endm").hide();
    $("#serumtubes_endm").hide();
    $("#bufferCoatTubes_endm").hide();
    $("#PlasmagridNo_endm").val("");
    $("#SerumgridNo_endm").val("");
    $("#bufferCoatgridNo_endm").val("");
  }
}
// Breast
function specimenSample() {
  if ($("#specimenSampleY").is(":checked")) {
    $("#countFttubes").show();
    $("#fttubes").show();
    $("#countFntubes").show();
    $("#fntubes").show();
  } else if ($("#specimenSampleN").is(":checked")) {
    $("#countFttubes").hide();
    $("#fttubes").hide();
    $("#countFntubes").hide();
    $("#fntubes").hide();
    $("#ftgrid").val("");
    $("#fngrid").val("");
    $("#ft_tubes").val("");
    $("#fn_tubes").val("");
  }
}
// Cervix
function specimenSample_ceix() {
  if ($("#specimenSampleY_ceix").is(":checked")) {
    $("#countFttubes_ceix").show();
    $("#fttubes_ceix").show();
    $("#countFntubes_ceix").show();
    $("#fntubes_ceix").show();
  } else if ($("#specimenSampleN_ceix").is(":checked")) {
    $("#countFttubes_ceix").hide();
    $("#fttubes_ceix").hide();
    $("#countFntubes_ceix").hide();
    $("#fntubes_ceix").hide();
    $("#ftgrid_ceix").val("");
    $("#fngrid_ceix").val("");
    $("#ft_tubes_ceix").val("");
    $("#fn_tubes_ceix").val("");
  }
}
// Ovary
function specimenSample_ovry() {
  if ($("#specimenSampleY_ovry").is(":checked")) {
    $("#countFttubes_ovry").show();
    $("#fttubes_ovry").show();
    $("#countFntubes_ovry").show();
    $("#fntubes_ovry").show();
  } else if ($("#specimenSampleN_ovry").is(":checked")) {
    $("#countFttubes_ovry").hide();
    $("#fttubes_ovry").hide();
    $("#countFntubes_ovry").hide();
    $("#fntubes_ovry").hide();
    $("#ftgrid_ovry").val("");
    $("#fngrid_ovry").val("");
    $("#ft_tubes_ovry").val("");
    $("#fn_tubes_ovry").val("");
  }
}
function breFd_ovry() {
  if ($("#breFdYes_ovry").is(":checked")) {
    $("#durFeed_ovry").show();
  } else {
    $("#durFeed_ovry").hide();
    $("#dbf_ovry").val();
  }
}
// Endometrium
function specimenSample_endm() {
  if ($("#specimenSampleY_endm").is(":checked")) {
    $("#countFttubes_endm").show();
    $("#fttubes_endm").show();
    $("#countFntubes_endm").show();
    $("#fntubes_endm").show();
  } else if ($("#specimenSampleN_endm").is(":checked")) {
    $("#countFttubes_endm").hide();
    $("#fttubes_endm").hide();
    $("#countFntubes_endm").hide();
    $("#fntubes_endm").hide();
    $("#ftgrid_endm").val("");
    $("#fngrid_endm").val("");
    $("#ft_tubes_endm").val("");
    $("#fn_tubes_endm").val("");
  }
}

function otherSample() {
  if ($("#otherSampleY").is(":checked")) {
    $("#oSampleTubes").show();
    $("#oSampleDesc").show();
  } else if ($("#otherSampleN").is(":checked")) {
    $("#oSampleTubes").hide();
    $("#oSampleDesc").hide();
    $("#OSgridNo").val("");
    $("#otSampleDesc").val("");
  }
}
// Cervix
function otherSample_ceix() {
  if ($("#otherSampleY_ceix").is(":checked")) {
    $("#oSampleTubes_ceix").show();
    $("#oSampleDesc_ceix").show();
  } else if ($("#otherSampleN_ceix").is(":checked")) {
    $("#oSampleTubes_ceix").hide();
    $("#oSampleDesc_ceix").hide();
    $("#OSgridNo_ceix").val("");
    $("#otSampleDesc_ceix").val("");
  }
}
// Ovary
function otherSample_ovry() {
  if ($("#otherSampleY_ovry").is(":checked")) {
    $("#oSampleTubes_ovry").show();
    $("#oSampleDesc_ovry").show();
  } else if ($("#otherSampleN_ovry").is(":checked")) {
    $("#oSampleTubes_ovry").hide();
    $("#oSampleDesc_ovry").hide();
    $("#OSgridNo_ovry").val("");
    $("#otSampleDesc_ovry").val("");
  }
}
// Endometrium
function otherSample_endm() {
  if ($("#otherSampleY_endm").is(":checked")) {
    $("#oSampleTubes_endm").show();
    $("#oSampleDesc_endm").show();
  } else if ($("#otherSampleN_endm").is(":checked")) {
    $("#oSampleTubes_endm").hide();
    $("#oSampleDesc_endm").hide();
    $("#OSgridNo_endm").val("");
    $("#otSampleDesc_endm").val("");
  }
}
function rltSample() {
  if ($("#rltSampleY").is(":checked")) {
    $("#rltSampleTubes").show();
  } else if ($("#rltSampleN").is(":checked")) {
    $("#rltSampleTubes").hide();
    $("#rltSgridNo").val("");
  }
}
// Cervix
function rltSample_ceix() {
  if ($("#rltSampleY_ceix").is(":checked")) {
    $("#rltSampleTubes_ceix").show();
  } else if ($("#rltSampleN_ceix").is(":checked")) {
    $("#rltSampleTubes_ceix").hide();
    $("#rltSgridNo_ceix").val("");
  }
}
rltSample_ceix();
$('input[name="rltSample_ceix"]').change(function () {
  rltSample_ceix();
});
// Ovary
function rltSample_ovry() {
  if ($("#rltSampleY_ovry").is(":checked")) {
    $("#rltSampleTubes_ovry").show();
  } else if ($("#rltSampleN_ovry").is(":checked")) {
    $("#rltSampleTubes_ovry").hide();
    $("#rltSgridNo_ovry").val("");
  }
}
rltSample_ovry();
$('input[name="rltSample_ovry"]').change(function () {
  rltSample_ovry();
});
// Endometrium
function rltSample_endm() {
  if ($("#rltSampleY_endm").is(":checked")) {
    $("#rltSampleTubes_endm").show();
  } else if ($("#rltSampleN_endm").is(":checked")) {
    $("#rltSampleTubes_endm").hide();
    $("#rltSgridNo_endm").val("");
  }
}

function pcbSample() {
  if ($("#pcbSampleY").is(":checked")) {
    $("#pcbViable").show();
    if ($("#pcbVY").is(":checked")) {
      $("#pcbSampleTubes").show();
    }
  } else if ($("#pcbSampleN").is(":checked")) {
    $("#pcbSampleTubes").hide();
    $('input[name="pcbV"]').prop("checked", false);
    $("#pcbViable").hide();
    $("#pcSgridNo").val("");
  }
}
function pcbV() {
  if ($("#pcbVY").is(":checked")) {
    $("#pcbSampleTubes").show();
  } else {
    $("#pcbSampleTubes").hide();
    $("#pcSgridNo").val("");
  }
}
// Cervix
function pcbSample_ceix() {
  if ($("#pcbSampleY_ceix").is(":checked")) {
    $("#pcbViable_ceix").show();
    if ($("#pcbVY_ceix").is(":checked")) {
      $("#pcbSampleTubes_ceix").show();
    }
  } else if ($("#pcbSampleN_ceix").is(":checked")) {
    $("#pcbSampleTubes_ceix").hide();
    $('input[name="pcbV_ceix"]').prop("checked", false);
    $("#pcbViable_ceix").hide();
    $("#pcbSgridNo_ceix").val("");
  }
}

function pcbV_ceix() {
  if ($("#pcbVY_ceix").is(":checked")) {
    $("#pcbSampleTubes_ceix").show();
  } else {
    $("#pcbSampleTubes_ceix").hide();
    $("#pcbSgridNo_ceix").val("");
  }
}

// Ovary
function pcbSample_ovry() {
  if ($("#pcbSampleY_ovry").is(":checked")) {
    $("#pcbViable_ovry").show();
    if ($("#pcbVY_ovry").is(":checked")) {
      $("#pcbSampleTubes_ovry").show();
    }
  } else if ($("#pcbSampleN_ovry").is(":checked")) {
    $("#pcbSampleTubes_ovry").hide();
    $('input[name="pcbV_ovry"]').prop("checked", false);
    $("#pcbViable_ovry").hide();
    $("#pcbSgridNo_ovry").val("");
  }
}
function pcbV_ovry() {
  if ($("#pcbVY_ovry").is(":checked")) {
    $("#pcbSampleTubes_ovry").show();
  } else {
    $("#pcbSampleTubes_ovry").hide();
    $("#pcbSgridNo_ovry").val("");
  }
}
// Endometrium
function pcbSample_endm() {
  if ($("#pcbSampleY_endm").is(":checked")) {
    $("#pcbViable_endm").show();
    if ($("#pcbVY_endm").is(":checked")) {
      $("#pcbSampleTubes_endm").show();
    }
  } else if ($("#pcbSampleN_endm").is(":checked")) {
    $("#pcbSampleTubes_endm").hide();
    $('input[name="pcbV_endm"]').prop("checked", false);
    $("#pcbViable_endm").hide();
    $("#pcSgridNo_endm").val("");
  }
}
function pcbV_endm() {
  if ($("#pcbVY_endm").is(":checked")) {
    $("#pcbSampleTubes_endm").show();
  } else {
    $("#pcbSampleTubes_endm").hide();
    $("#pcSgridNo_endm").val("");
  }
}

function sampleReceive() {
  if ($("#radioprocessed1").is(":checked")) {
    $("#receiveAllSample").show();
    $("#processAllSample").show();
    $("#AllSamplesProcess").show();
    $("#BprocessedBy").val("");
    $("#bloodSampleReceivedDate").val("");
    $("#bloodSampleReceivedTime").val("");
    $("#bloodSampleProcessedDate").val("");
    $("#bloodSampleProcessedTime").val("");
    $("#SprocessedBy").val("");
    $("#SpecimenSampleReceivedDate").val("");
    $("#SpecimenSampleReceivedTime").val("");
    $("#SpecimenSampleProcessedDate").val("");
    $("#SpecimenSampleProcessedTime").val("");
    $("#OprocessedBy").val("");
    $("#OtherSampleReceivedDate").val("");
    $("#OtherSampleReceivedTime").val("");
    $("#OtherSampleProcessedDate").val("");
    $("#OtherSampleProcessedTime").val("");
    $("#RLTprocessedBy").val("");
    $("#RLTSampleReceivedDate").val("");
    $("#RLTSampleReceivedTime").val("");
    $("#RLTSampleProcessedDate").val("");
    $("#RLTSampleProcessedTime").val("");
    $("#PCprocessedBy").val("");
    $("#PCSampleReceivedDate").val("");
    $("#PCSampleReceivedTime").val("");
    $("#PCSampleProcessedDate").val("");
    $("#PCSampleProcessedTime").val("");
  } else if ($("#radioprocessed2").is(":checked")) {
    $("#receiveAllSample").hide();
    $("#processAllSample").hide();
    $("#AllSamplesProcess").hide();
    $("#processedBy").val("");
    $("#sampleReceivedDate").val("");
    $("#sampleReceivedTime").val("");
    $("#sampleProcessedDate").val("");
    $("#sampleProcessedTime").val("");
  } else if (!$("#radioprocessed1").is(":checked") && !$("#radioprocessed2").is(":checked")) {
    $("#receiveAllSample").hide();
    $("#processAllSample").hide();
    $("#AllSamplesProcess").hide();
    $("#processedBy").val("");
    $("#sampleReceivedDate").val("");
    $("#sampleReceivedTime").val("");
    $("#sampleProcessedDate").val("");
    $("#sampleProcessedTime").val("");
    $("#BprocessedBy").val("");
    $("#bloodSampleReceivedDate").val("");
    $("#bloodSampleReceivedTime").val("");
    $("#bloodSampleProcessedDate").val("");
    $("#bloodSampleProcessedTime").val("");
    $("#SprocessedBy").val("");
    $("#SpecimenSampleReceivedDate").val("");
    $("#SpecimenSampleReceivedTime").val("");
    $("#SpecimenSampleProcessedDate").val("");
    $("#SpecimenSampleProcessedTime").val("");
    $("#OprocessedBy").val("");
    $("#OtherSampleReceivedDate").val("");
    $("#OtherSampleReceivedTime").val("");
    $("#OtherSampleProcessedDate").val("");
    $("#OtherSampleProcessedTime").val("");
  }
  if ($("#radioprocessed2").is(":checked") && $("#bloodSampleY").is(":checked")) {
    $("#receiveBloodSample").show();
    $("#processBloodSample").show();
    $("#BloodSamplesProcess").show();
  } else {
    $("#receiveBloodSample").hide();
    $("#processBloodSample").hide();
    $("#BloodSamplesProcess").hide();
  }
  if ($("#radioprocessed2").is(":checked") && $("#specimenSampleY").is(":checked")) {
    $("#receiveSpecimenSample").show();
    $("#processSpecimenSample").show();
    $("#SpecimenSamplesProcess").show();
  } else {
    $("#receiveSpecimenSample").hide();
    $("#processSpecimenSample").hide();
    $("#SpecimenSamplesProcess").hide();
  }
  if ($("#radioprocessed2").is(":checked") && $("#otherSampleY").is(":checked")) {
    $("#receiveOtherSample").show();
    $("#processOtherSample").show();
    $("#OtherSamplesProcess").show();
  } else {
    $("#receiveOtherSample").hide();
    $("#processOtherSample").hide();
    $("#OtherSamplesProcess").hide();
  }
  if ($("#radioprocessed2").is(":checked") && $("#rltSampleY").is(":checked")) {
    $("#receiveRLTSample").show();
    $("#processRLTSample").show();
    $("#RLTSamplesProcess").show();
  } else {
    $("#receiveRLTSample").hide();
    $("#processRLTSample").hide();
    $("#RLTSamplesProcess").hide();
  }
  if ($("#radioprocessed2").is(":checked") && $("#pcbSampleY").is(":checked")) {
    $("#receivePCSample").show();
    $("#processPCSample").show();
    $("#PCSamplesProcess").show();
  } else {
    $("#receivePCSample").hide();
    $("#processPCSample").hide();
    $("#PCSamplesProcess").hide();
  }
}
// Ovary
function sampleReceive_ovry() {
  if ($("#radioprocessed1_ovry").is(":checked")) {
    $("#receiveAllSample_ovry").show();
    $("#processAllSample_ovry").show();
    $("#AllSamplesProcess_ovry").show();
    $("#BprocessedBy_ovry").val("");
    $("#bloodSampleReceivedDate_ovry").val("");
    $("#bloodSampleReceivedTime_ovry").val("");
    $("#bloodSampleProcessedDate_ovry").val("");
    $("#bloodSampleProcessedTime_ovry").val("");
    $("#SprocessedBy_ovry").val("");
    $("#SpecimenSampleReceivedDate_ovry").val("");
    $("#SpecimenSampleReceivedTime_ovry").val("");
    $("#SpecimenSampleProcessedDate_ovry").val("");
    $("#SpecimenSampleProcessedTime_ovry").val("");
    $("#OprocessedBy_ovry").val("");
    $("#OtherSampleReceivedDate_ovry").val("");
    $("#OtherSampleReceivedTime_ovry").val("");
    $("#OtherSampleProcessedDate_ovry").val("");
    $("#OtherSampleProcessedTime_ovry").val("");
    $("#RLTprocessedBy_ovry").val("");
    $("#RLTSampleReceivedDate_ovry").val("");
    $("#RLTSampleReceivedTime_ovry").val("");
    $("#RLTSampleProcessedDate_ovry").val("");
    $("#RLTSampleProcessedTime_ovry").val("");
    $("#PCprocessedBy_ovry").val("");
    $("#PCSampleReceivedDate_ovry").val("");
    $("#PCSampleReceivedTime_ovry").val("");
    $("#PCSampleProcessedDate_ovry").val("");
    $("#PCSampleProcessedTime_ovry").val("");
  } else if ($("#radioprocessed2_ovry").is(":checked")) {
    $("#receiveAllSample_ovry").hide();
    $("#processAllSample_ovry").hide();
    $("#AllSamplesProcess_ovry").hide();
    $("#processedBy_ovry").val("");
    $("#sampleReceivedDate_ovry").val("");
    $("#sampleReceivedTime_ovry").val("");
    $("#sampleProcessedDate_ovry").val("");
    $("#sampleProcessedTime_ovry").val("");
  } else if (!$("#radioprocessed1_ovry").is(":checked") && !$("#radioprocessed2_ovry").is(":checked")) {
    $("#receiveAllSample_ovry").hide();
    $("#processAllSample_ovry").hide();
    $("#AllSamplesProcess_ovry").hide();
    $("#processedBy_ovry").val("");
    $("#sampleReceivedDate_ovry").val("");
    $("#sampleReceivedTime_ovry").val("");
    $("#sampleProcessedDate_ovry").val("");
    $("#sampleProcessedTime_ovry").val("");
    $("#BprocessedBy_ovry").val("");
    $("#bloodSampleReceivedDate_ovry").val("");
    $("#bloodSampleReceivedTime_ovry").val("");
    $("#bloodSampleProcessedDate_ovry").val("");
    $("#bloodSampleProcessedTime_ovry").val("");
    $("#SprocessedBy_ovry").val("");
    $("#SpecimenSampleReceivedDate_ovry").val("");
    $("#SpecimenSampleReceivedTime_ovry").val("");
    $("#SpecimenSampleProcessedDate_ovry").val("");
    $("#SpecimenSampleProcessedTime_ovry").val("");
    $("#OprocessedBy_ovry").val("");
    $("#OtherSampleReceivedDate_ovry").val("");
    $("#OtherSampleReceivedTime_ovry").val("");
    $("#OtherSampleProcessedDate_ovry").val("");
    $("#OtherSampleProcessedTime_ovry").val("");
  }
  if ($("#radioprocessed2_ovry").is(":checked") && $("#bloodSampleY_ovry").is(":checked")) {
    $("#receiveBloodSample_ovry").show();
    $("#processBloodSample_ovry").show();
    $("#BloodSamplesProcess_ovry").show();
  } else {
    $("#receiveBloodSample_ovry").hide();
    $("#processBloodSample_ovry").hide();
    $("#BloodSamplesProcess_ovry").hide();
  }
  if ($("#radioprocessed2_ovry").is(":checked") && $("#specimenSampleY_ovry").is(":checked")) {
    $("#receiveSpecimenSample_ovry").show();
    $("#processSpecimenSample_ovry").show();
    $("#SpecimenSamplesProcess_ovry").show();
  } else {
    $("#receiveSpecimenSample_ovry").hide();
    $("#processSpecimenSample_ovry").hide();
    $("#SpecimenSamplesProcess_ovry").hide();
  }
  if ($("#radioprocessed2_ovry").is(":checked") && $("#otherSampleY_ovry").is(":checked")) {
    $("#receiveOtherSample_ovry").show();
    $("#processOtherSample_ovry").show();
    $("#OtherSamplesProcess_ovry").show();
  } else {
    $("#receiveOtherSample_ovry").hide();
    $("#processOtherSample_ovry").hide();
    $("#OtherSamplesProcess_ovry").hide();
  }
  if ($("#radioprocessed2_ovry").is(":checked") && $("#rltSampleY_ovry").is(":checked")) {
    $("#receiveRLTSample_ovry").show();
    $("#processRLTSample_ovry").show();
    $("#RLTSamplesProcess_ovry").show();
  } else {
    $("#receiveRLTSample_ovry").hide();
    $("#processRLTSample_ovry").hide();
    $("#RLTSamplesProcess_ovry").hide();
  }
  if ($("#radioprocessed2_ovry").is(":checked") && $("#pcbSampleY_ovry").is(":checked")) {
    $("#receivePCSample_ovry").show();
    $("#processPCSample_ovry").show();
    $("#PCSamplesProcess_ovry").show();
  } else {
    $("#receivePCSample_ovry").hide();
    $("#processPCSample_ovry").hide();
    $("#PCSamplesProcess_ovry").hide();
  }
}
// sampleReceive_ovry();
// $('input[name="processedRadio_ovry"]').change(function () {
//   sampleReceive_ovry();
// });
// Endometrium
function sampleReceive_endm() {
  if ($("#radioprocessed1_endm").is(":checked")) {
    $("#receiveAllSample_endm").show();
    $("#processAllSample_endm").show();
    $("#AllSamplesProcess_endm").show();
    $("#BprocessedBy_endm").val("");
    $("#bloodSampleReceivedDate_endm").val("");
    $("#bloodSampleReceivedTime_endm").val("");
    $("#bloodSampleProcessedDate_endm").val("");
    $("#bloodSampleProcessedTime_endm").val("");
    $("#SprocessedBy_endm").val("");
    $("#SpecimenSampleReceivedDate_endm").val("");
    $("#SpecimenSampleReceivedTime_endm").val("");
    $("#SpecimenSampleProcessedDate_endm").val("");
    $("#SpecimenSampleProcessedTime_endm").val("");
    $("#OprocessedBy_endm").val("");
    $("#OtherSampleReceivedDate_endm").val("");
    $("#OtherSampleReceivedTime_endm").val("");
    $("#OtherSampleProcessedDate_endm").val("");
    $("#OtherSampleProcessedTime_endm").val("");
    $("#RLTprocessedBy_endm").val("");
    $("#RLTSampleReceivedDate_endm").val("");
    $("#RLTSampleReceivedTime_endm").val("");
    $("#RLTSampleProcessedDate_endm").val("");
    $("#RLTSampleProcessedTime_endm").val("");
    $("#PCprocessedBy_endm").val("");
    $("#PCSampleReceivedDate_endm").val("");
    $("#PCSampleReceivedTime_endm").val("");
    $("#PCSampleProcessedDate_endm").val("");
    $("#PCSampleProcessedTime_endm").val("");
  } else if ($("#radioprocessed2_endm").is(":checked")) {
    $("#receiveAllSample_endm").hide();
    $("#processAllSample_endm").hide();
    $("#AllSamplesProcess_endm").hide();
    $("#processedBy_endm").val("");
    $("#sampleReceivedDate_endm").val("");
    $("#sampleReceivedTime_endm").val("");
    $("#sampleProcessedDate_endm").val("");
    $("#sampleProcessedTime_endm").val("");
  } else if (!$("#radioprocessed1_endm").is(":checked") && !$("#radioprocessed2_endm").is(":checked")) {
    $("#receiveAllSample_endm").hide();
    $("#processAllSample_endm").hide();
    $("#AllSamplesProcess_endm").hide();
    $("#processedBy_endm").val("");
    $("#sampleReceivedDate_endm").val("");
    $("#sampleReceivedTime_endm").val("");
    $("#sampleProcessedDate_endm").val("");
    $("#sampleProcessedTime_endm").val("");
    $("#BprocessedBy_endm").val("");
    $("#bloodSampleReceivedDate_endm").val("");
    $("#bloodSampleReceivedTime_endm").val("");
    $("#bloodSampleProcessedDate_endm").val("");
    $("#bloodSampleProcessedTime_endm").val("");
    $("#SprocessedBy_endm").val("");
    $("#SpecimenSampleReceivedDate_endm").val("");
    $("#SpecimenSampleReceivedTime_endm").val("");
    $("#SpecimenSampleProcessedDate_endm").val("");
    $("#SpecimenSampleProcessedTime_endm").val("");
    $("#OprocessedBy_endm").val("");
    $("#OtherSampleReceivedDate_endm").val("");
    $("#OtherSampleReceivedTime_endm").val("");
    $("#OtherSampleProcessedDate_endm").val("");
    $("#OtherSampleProcessedTime_endm").val("");
  }
  if ($("#radioprocessed2_endm").is(":checked") && $("#bloodSampleY_endm").is(":checked")) {
    $("#receiveBloodSample_endm").show();
    $("#processBloodSample_endm").show();
    $("#BloodSamplesProcess_endm").show();
  } else {
    $("#receiveBloodSample_endm").hide();
    $("#processBloodSample_endm").hide();
    $("#BloodSamplesProcess_endm").hide();
  }
  if ($("#radioprocessed2_endm").is(":checked") && $("#specimenSampleY_endm").is(":checked")) {
    $("#receiveSpecimenSample_endm").show();
    $("#processSpecimenSample_endm").show();
    $("#SpecimenSamplesProcess_endm").show();
  } else {
    $("#receiveSpecimenSample_endm").hide();
    $("#processSpecimenSample_endm").hide();
    $("#SpecimenSamplesProcess_endm").hide();
  }
  if ($("#radioprocessed2_endm").is(":checked") && $("#otherSampleY_endm").is(":checked")) {
    $("#receiveOtherSample_endm").show();
    $("#processOtherSample_endm").show();
    $("#OtherSamplesProcess_endm").show();
  } else {
    $("#receiveOtherSample_endm").hide();
    $("#processOtherSample_endm").hide();
    $("#OtherSamplesProcess_endm").hide();
  }
  if ($("#radioprocessed2_endm").is(":checked") && $("#rltSampleY_endm").is(":checked")) {
    $("#receiveRLTSample_endm").show();
    $("#processRLTSample_endm").show();
    $("#RLTSamplesProcess_endm").show();
  } else {
    $("#receiveRLTSample_endm").hide();
    $("#processRLTSample_endm").hide();
    $("#RLTSamplesProcess_endm").hide();
  }
  if ($("#radioprocessed2_endm").is(":checked") && $("#pcbSampleY_endm").is(":checked")) {
    $("#receivePCSample_endm").show();
    $("#processPCSample_endm").show();
    $("#PCSamplesProcess_endm").show();
  } else {
    $("#receivePCSample_endm").hide();
    $("#processPCSample_endm").hide();
    $("#PCSamplesProcess_endm").hide();
  }
}
// sampleReceive_endm();
// $('input[name="processedRadio_endm"]').change(function () {
//   sampleReceive_endm();
// });
// Cervix
function sampleReceive_ceix() {
  if ($("#radioprocessed1_ceix").is(":checked")) {
    $("#receiveAllSample_ceix").show();
    $("#processAllSample_ceix").show();
    $("#AllSamplesProcess_ceix").show();
    $("#BprocessedBy_ceix").val("");
    $("#bloodSampleReceivedDate_ceix").val("");
    $("#bloodSampleReceivedTime_ceix").val("");
    $("#bloodSampleProcessedDate_ceix").val("");
    $("#bloodSampleProcessedTime_ceix").val("");
    $("#SprocessedBy_ceix").val("");
    $("#SpecimenSampleReceivedDate_ceix").val("");
    $("#SpecimenSampleReceivedTime_ceix").val("");
    $("#SpecimenSampleProcessedDate_ceix").val("");
    $("#SpecimenSampleProcessedTime_ceix").val("");
    $("#OprocessedBy_ceix").val("");
    $("#OtherSampleReceivedDate_ceix").val("");
    $("#OtherSampleReceivedTime_ceix").val("");
    $("#OtherSampleProcessedDate_ceix").val("");
    $("#OtherSampleProcessedTime_ceix").val("");
    $("#RLTprocessedBy_ceix").val("");
    $("#RLTSampleReceivedDate_ceix").val("");
    $("#RLTSampleReceivedTime_ceix").val("");
    $("#RLTSampleProcessedDate_ceix").val("");
    $("#RLTSampleProcessedTime_ceix").val("");
    $("#PCprocessedBy_ceix").val("");
    $("#PCSampleReceivedDate_ceix").val("");
    $("#PCSampleReceivedTime_ceix").val("");
    $("#PCSampleProcessedDate_ceix").val("");
    $("#PCSampleProcessedTime_ceix").val("");
  } else if ($("#radioprocessed2_ceix").is(":checked")) {
    $("#receiveAllSample_ceix").hide();
    $("#processAllSample_ceix").hide();
    $("#AllSamplesProcess_ceix").hide();
    $("#processedBy_ceix").val("");
    $("#sampleReceivedDate_ceix").val("");
    $("#sampleReceivedTime_ceix").val("");
    $("#sampleProcessedDate_ceix").val("");
    $("#sampleProcessedTime_ceix").val("");
  } else if (!$("#radioprocessed1_ceix").is(":checked") && !$("#radioprocessed2_ceix").is(":checked")) {
    $("#receiveAllSample_ceix").hide();
    $("#processAllSample_ceix").hide();
    $("#AllSamplesProcess_ceix").hide();
    $("#processedBy_ceix").val("");
    $("#sampleReceivedDate_ceix").val("");
    $("#sampleReceivedTime_ceix").val("");
    $("#sampleProcessedDate_ceix").val("");
    $("#sampleProcessedTime_ceix").val("");
    $("#BprocessedBy_ceix").val("");
    $("#bloodSampleReceivedDate_ceix").val("");
    $("#bloodSampleReceivedTime_ceix").val("");
    $("#bloodSampleProcessedDate_ceix").val("");
    $("#bloodSampleProcessedTime_ceix").val("");
    $("#SprocessedBy_ceix").val("");
    $("#SpecimenSampleReceivedDate_ceix").val("");
    $("#SpecimenSampleReceivedTime_ceix").val("");
    $("#SpecimenSampleProcessedDate_ceix").val("");
    $("#SpecimenSampleProcessedTime_ceix").val("");
    $("#OprocessedBy_ceix").val("");
    $("#OtherSampleReceivedDate_ceix").val("");
    $("#OtherSampleReceivedTime_ceix").val("");
    $("#OtherSampleProcessedDate_ceix").val("");
    $("#OtherSampleProcessedTime_ceix").val("");
  }
  if ($("#radioprocessed2_ceix").is(":checked") && $("#bloodSampleY_ceix").is(":checked")) {
    $("#receiveBloodSample_ceix").show();
    $("#processBloodSample_ceix").show();
    $("#BloodSamplesProcess_ceix").show();
  } else {
    $("#receiveBloodSample_ceix").hide();
    $("#processBloodSample_ceix").hide();
    $("#BloodSamplesProcess_ceix").hide();
  }
  if ($("#radioprocessed2_ceix").is(":checked") && $("#specimenSampleY_ceix").is(":checked")) {
    $("#receiveSpecimenSample_ceix").show();
    $("#processSpecimenSample_ceix").show();
    $("#SpecimenSamplesProcess_ceix").show();
  } else {
    $("#receiveSpecimenSample_ceix").hide();
    $("#processSpecimenSample_ceix").hide();
    $("#SpecimenSamplesProcess_ceix").hide();
  }
  if ($("#radioprocessed2_ceix").is(":checked") && $("#otherSampleY_ceix").is(":checked")) {
    $("#receiveOtherSample_ceix").show();
    $("#processOtherSample_ceix").show();
    $("#OtherSamplesProcess_ceix").show();
  } else {
    $("#receiveOtherSample_ceix").hide();
    $("#processOtherSample_ceix").hide();
    $("#OtherSamplesProcess_ceix").hide();
  }
  if ($("#radioprocessed2_ceix").is(":checked") && $("#rltSampleY_ceix").is(":checked")) {
    $("#receiveRLTSample_ceix").show();
    $("#processRLTSample_ceix").show();
    $("#RLTSamplesProcess_ceix").show();
  } else {
    $("#receiveRLTSample_ceix").hide();
    $("#processRLTSample_ceix").hide();
    $("#RLTSamplesProcess_ceix").hide();
  }
  if ($("#radioprocessed2_ceix").is(":checked") && $("#pcbSampleY_ceix").is(":checked")) {
    $("#receivePCSample_ceix").show();
    $("#processPCSample_ceix").show();
    $("#PCSamplesProcess_ceix").show();
  } else {
    $("#receivePCSample_ceix").hide();
    $("#processPCSample_ceix").hide();
    $("#PCSamplesProcess_ceix").hide();
  }
}

function familyHabitToggle() {
  if ($("#familyHistoryCancer1").is(":checked")) {
    $("#relation_Cancer").show();
  } else {
    $("#relation_Cancer").hide();
    $("#familyRelation").val("");
    $("#familyCancerType").val("");
  }
}
function familyHabitToggle_ceix() {
  if ($("#familyHistoryCancer1_ceix").is(":checked")) {
    $("#relation_Cancer_ceix").show();
  } else {
    $("#relation_Cancer_ceix").hide();
    $("#familyRelation_ceix").val("");
    $("#familyCancerType_ceix").val("");
  }
}
function familyHabitToggle_ovry() {
  if ($("#familyHistoryCancer1_ovry").is(":checked")) {
    $("#relation_Cancer_ovry").show();
  } else {
    $("#relation_Cancer_ovry").hide();
    $("#familyRelation_ovry").val("");
    $("#familyCancerType_ovry").val("");
  }
}
function familyHabitToggle_endm() {
  if ($("#familyHistoryCancer1_endm").is(":checked")) {
    $("#relation_Cancer_endm").show();
  } else {
    $("#relation_Cancer_endm").hide();
    $("#familyRelation_endm").val("");
    $("#familyCancerType_endm").val("");
  }
}
function RadioHisOfCToggle_endm() {
  if ($("#HisOfC1_endm").is(":checked")) {
    $("#ttt_endm").show();
  } else {
    $("#ttt_endm").hide();
    $("#typ_endm").val("");
    $("#treatment_endm").val("");
  }
}
function ExistComorbidity() {
  if ($("#ECH1").is(":checked")) {
    $("#cvSym").show();
  } else {
    $("#cvSym").hide();
    const dropdownContainer = document.getElementsByClassName("cmd");
    Array.from(dropdownContainer).forEach((container) => {
      container.innerHTML = "";
    });
  }
}
// Cervix
function ExistComorbidity_ceix() {
  if ($("#ECH1_ceix").is(":checked")) {
    $("#cvSym_ceix").show();
  } else {
    $("#cvSym_ceix").hide();
    const dropdownContainer = document.getElementsByClassName("cmd_ceix");
    Array.from(dropdownContainer).forEach((container) => {
      container.innerHTML = "";
    });
  }
}
// Ovary
function ExistComorbidity_ovry() {
  if ($("#ECH1_ovry").is(":checked")) {
    $("#cvSym_ovry").show();
  } else {
    $("#cvSym_ovry").hide();
    const dropdownContainer = document.getElementsByClassName("cmd_ovry");
    Array.from(dropdownContainer).forEach((container) => {
      container.innerHTML = "";
    });
  }
}
function ExistComorbidity_endm() {
  if ($("#ECH1_endm").is(":checked")) {
    $("#cvSym_endm").show();
  } else {
    $("#cvSym_endm").hide();
    const dropdownContainer = document.getElementsByClassName("cmd_endm");
    Array.from(dropdownContainer).forEach((container) => {
      container.remove();
    });
  }
}
function IHCMarker() {
  if ($("#IHC_yes").is(":checked")) {
    $("#ihcDescr").show();
  } else {
    $("#ihcDescr").hide();
    $("#IHC_Description").val("");
  }
}
// Cervix
function IHCMarker_ceix() {
  if ($("#IHC_yes_ceix").is(":checked")) {
    $("#ihcDescr_ceix").show();
  } else {
    $("#ihcDescr_ceix").hide();
    $("#IHC_Description_ceix").val("");
  }
}
// Ovary
function IHCMarker_ovry() {
  if ($("#IHC_yes_ovry").is(":checked")) {
    $("#ihcDescr_ovry").show();
  } else {
    $("#ihcDescr_ovry").hide();
    $("#IHC_Description_ovry").val("");
  }
}
// Endm
function IHCMarker_endm() {
  if ($("#IHC_yes_endm").is(":checked")) {
    $("#ihcDescr_endm").show();
  } else {
    $("#ihcDescr_endm").hide();
    $("#IHC_Description_endm").val("");
  }
}
function GeneticT() {
  if ($("#gt_yes").is(":checked")) {
    $("#dt_Desc").show();
    $("#gtrs").show();
  } else {
    $("#dt_Desc").hide();
    $("#gtrs").hide();
    $("#gtr").val("");
    $("#GT_Description").val("");
  }
}
// Cervix
function GeneticT_ceix() {
  if ($("#gt_yes_ceix").is(":checked")) {
    $("#dt_Desc_ceix").show();
    $("#gtrs_ceix").show();
  } else {
    $("#dt_Desc_ceix").hide();
    $("#gtrs_ceix").hide();
    $("#gtr_ceix").val("");
    $("#GT_Description_ceix").val("");
  }
}
// Ovary
function GeneticT_ovry() {
  if ($("#gt_yes_ovry").is(":checked")) {
    $("#dt_Desc_ovry").show();
    $("#gtrs_ovry").show();
    $("#HRD_ovry").show();
    $("#BRCA_NGS_ovry").show();
  } else {
    $("#dt_Desc_ovry").hide();
    $("#gtrs_ovry").hide();
    $("#HRD_ovry").hide();
    $("#BRCA_NGS_ovry").hide();
    $("#gtr_ovry").val("");
    $("#gtrPositiveType_ovry").val("");
    $("#gtrPositiveTypeContainer_ovry").hide();
    $("#hrd_ovry").val("");
    $("#brca_ngs_ovry").val("");
    $("#GT_Description_ovry").val("");
  }
}
// Endm
function GeneticT_endm() {
  if ($("#gt_yes_endm").is(":checked")) {
    $("#dt_Desc_endm").show();
    $("#gtrs_endm").show();
  } else {
    $("#dt_Desc_endm").hide();
    $("#gtrs_endm").hide();
    $("#gtr_endm").val("");
    $("#GT_Description_endm").val("");
  }
}
function mInv_endm() {
  if ($("#mInv_outer_endm").is(":checked") || $("#mInv_inner_endm").is(":checked")) {
    $("#depthMyometrialInv_endm").show();
    $("#percentageMyometrialInv_endm").show();
  } else {
    $("#depthMyometrialInv_endm").hide();
    $("#percentageMyometrialInv_endm").hide();
    $("#depthMyometrialInv_endm").val("");
    $("#percentageMyometrialInv_endm").val("");
  }
}
function NactYes() {
  if ($("#NACTYes").is(":checked")) {
    $("#nactDC").show();
    $("#nactDLC").show();
    $("#nactTE").show();
  } else {
    $("#nactDC").hide();
    $("#nactDLC").hide();
    $("#nactTE").hide();
    $("#NACT_cycle").val("");
    $("#NACT_cycle_D").val("");
  }
}
// Cervix
function NactYes_ceix() {
  if ($("#NACTYes_ceix").is(":checked")) {
    $("#nactDC_ceix").show();
    $("#nactDLC_ceix").show();
  } else {
    $("#nactDC_ceix").hide();
    $("#nactDLC_ceix").hide();
    $("#NACT_cycle_ceix").val("");
    $("#NACT_cycle_D_ceix").val("");
  }
}
function NartYes_ceix() {
  if ($("#NARTYes_ceix").is(":checked")) {
    $("#nartDC_ceix").show();
    $("#nartDF_ceix").show();
    $("#nartDT_ceix").show();
    $("#nartDLC_ceix").show();
  } else {
    $("#nartDC_ceix").hide();
    $("#nartDF_ceix").hide();
    $("#nartDT_ceix").hide();
    $("#nartDLC_ceix").hide();

    $("#NART_cycle_D_ceix").val("");
    $("#NART_cycle_T_ceix").val("");
    $("#NART_cycle_ceix").val("");
    $("#NART_cycle_DC_ceix").val("");
  }
}

// Ovary
function NactYes_ovry() {
  if ($("#NACTYes_ovry").is(":checked")) {
    $("#nactDC_ovry").show();
    $("#nactDLC_ovry").show();
    $("#nactCRS_ovry").show();
  } else {
    $("#nactDC_ovry").hide();
    $("#nactDLC_ovry").hide();
    $("#nactCRS_ovry").hide();
    $("#NACT_cycle_ovry").val("");
    $("#NACT_cycle_D_ovry").val("");
  }
}
// Endometrium
function NactYes_endm() {
  if ($("#NACTYes_endm").is(":checked")) {
    $("#nactDC_endm").show();
    $("#nactDLC_endm").show();
  } else {
    $("#nactDC_endm").hide();
    $("#nactDLC_endm").hide();
    $("#NACT_cycle_endm").val("");
    $("#NACT_cycle_D_endm").val("");
  }
}
function actYes() {
  if ($("#ACTYes").is(":checked")) {
    $("#actDC").show();
    $("#actDLC").show();
  } else {
    $("#actDC").hide();
    $("#actDLC").hide();
    $("#actDrugCycles").val("");
    $("#actDateLastCycle").val("");
  }
}
// Cervix
function actYes_ceix() {
  if ($("#ACTYes_ceix").is(":checked")) {
    $("#actDC_ceix").show();
    $("#actDLC_ceix").show();
  } else {
    $("#actDC_ceix").hide();
    $("#actDLC_ceix").hide();
    $("#actDrugCycles_ceix").val("");
    $("#actDateLastCycle_ceix").val("");
  }
}
// Ovary
function actYes_ovry() {
  console.log("Changing");
  if ($("#ACTYes_ovry").is(":checked")) {
    $("#actDC_ovry").show();
    $("#actDLC_ovry").show();
  } else {
    $("#actDC_ovry").hide();
    $("#actDLC_ovry").hide();
    $("#actDrugCycles_ovry").val("");
    $("#actDateLastCycle_ovry").val("");
  }
}
function actYes_endm() {
  if ($("#ACTYes_endm").is(":checked")) {
    $("#actDC_endm").show();
    $("#actDLC_endm").show();
  } else {
    $("#actDC_endm").hide();
    $("#actDLC_endm").hide();
    $("#actDrugCycles_endm").val("");
    $("#actDateLastCycle_endm").val("");
  }
}
function RadioTYes() {
  if ($("#RTYes").is(":checked")) {
    $("#rtDLC").show();
    $("#rtDC1").show();
    $("#rtDC2").show();
    $("#rtDC3").show();
  } else {
    $("#rtDC1").hide();
    $("#rtDC2").hide();
    $("#rtDC3").hide();
    $("#rtDLC").hide();
    $("#rtDetails1").val("");
    $("#rtDetails2").val("");
    $("#rtDetails3").val("");
    $("#radiotherapyLastCycleDate").val("");
  }
}
// Cervix
function RadioTYes_ceix() {
  if ($("#RTYes_ceix").is(":checked")) {
    $("#rtDC1_ceix").show();
    $("#rtDC2_ceix").show();
    $("#rtDC3_ceix").show();
    $("#rtDLC_ceix").show();
  } else {
    $("#rtDC1_ceix").hide();
    $("#rtDC2_ceix").hide();
    $("#rtDC3_ceix").hide();
    $("#rtDLC_ceix").hide();
    $("#rtDetails1_ceix").val("");
    $("#rtDetails2_ceix").val("");
    $("#rtDetails3_ceix").val("");
    $("#radiotherapyLastCycleDate_ceix").val("");
  }
}
// Ovary
function RadioTYes_ovry() {
  if ($("#RTYes_ovry").is(":checked")) {
    $("#rtDC1_ovry").show();
    $("#rtDC2_ovry").show();
    $("#rtDC3_ovry").show();
    $("#rtDLC_ovry").show();
  } else {
    $("#rtDC1_ovry").hide();
    $("#rtDC2_ovry").hide();
    $("#rtDC3_ovry").hide();
    $("#rtDLC_ovry").hide();
    $("#rtDetails1_ovry").val("");
    $("#rtDetails2_ovry").val("");
    $("#rtDetails3_ovry").val("");
    $("#radiotherapyLastCycleDate_ovry").val("");
  }
}
function RadioTYes_endm() {
  if ($("#RTYes_endm").is(":checked")) {
    $("#rtDC1_endm").show();
    $("#rtDC2_endm").show();
    $("#rtDC3_endm").show();
    $("#rtDLC_endm").show();
  } else {
    $("#rtDC1_endm").hide();
    $("#rtDC2_endm").hide();
    $("#rtDC3_endm").hide();
    $("#rtDLC_endm").hide();
    $("#rtDetails1_endm").val("");
    $("#rtDetails2_endm").val("");
    $("#rtDetails3_endm").val("");
    $("#radiotherapyLastCycleDate_endm").val("");
  }
}
function RadioTYes_ceix() {
  if ($("#RTYes_ceix").is(":checked")) {
    $("#rtDC1_ceix").show();
    $("#rtDC2_ceix").show();
    $("#rtDC3_ceix").show();
    $("#rtDLC_ceix").show();
  } else {
    $("#rtDC1_ceix").hide();
    $("#rtDC2_ceix").hide();
    $("#rtDC3_ceix").hide();
    $("#rtDLC_ceix").hide();
    $("#rtDetails1_ceix").val("");
    $("#rtDetails2_ceix").val("");
    $("#rtDetails3_ceix").val("");
    $("#radiotherapyLastCycleDate_ceix").val("");
  }
}
// PARP
function parpYes_ovry() {
  if ($("#PARPYes_ovry").is(":checked")) {
    $("#parpDLC_ovry").show();
    $("#parpDC_ovry").show();
  } else {
    $("#parpDC_ovry").hide();
    $("#parpDLC_ovry").hide();
    $("#parpDrugCycles_ovry").val("");
    $("#parpDateLastCycle_ovry").val("");
  }
}
function horTYes() {
  if ($("#horTYes").is(":checked")) {
    $("#horTD").show();
  } else {
    $("#horTD").hide();
    $("#hormone_Cycles").val("");
  }
}
// Cervix
function horTYes_ceix() {
  if ($("#horTYes_ceix").is(":checked")) {
    $("#horTD_ceix").show();
  } else {
    $("#horTD_ceix").hide();
    $("#hormone_Cycles_ceix").val("");
  }
}
function tarTYes() {
  if ($("#tarTYes").is(":checked")) {
    $("#tarTD").show();
  } else {
    $("#tarTD").hide();
    $("#Tar_Cycles").val("");
  }
}
function tarTYes_ceix() {
  if ($("#tarTYes_ceix").is(":checked")) {
    $("#tarTD_ceix").show();
  } else {
    $("#tarTD_ceix").hide();
    $("#Tar_Cycles_ceix").val("");
  }
}

function parity() {
  let parityValue = parseInt($("#parity").val(), 10);

  if (parityValue > 15) {
    parityValue = 0;
    $("#parity").val(parityValue);
  } else if (parityValue < 0) {
    parityValue = 0;
    $("#parity").val(parityValue);
  }

  if (parityValue > 0) {
    $("#noChild").show();
  } else {
    $("#noChild").hide();
  }
}
function parity_ceix() {
  let parityValue = parseInt($("#parity_ceix").val(), 10);
  if (parityValue > 15) {
    parityValue = 0;
    $("#parity_ceix").val(parityValue);
  } else if (parityValue < 0) {
    parityValue = 0;
    $("#parity_ceix").val(parityValue);
  }

  if (parityValue > 0) {
    $("#noChild_ceix").show();
  } else {
    $("#noChild_ceix").hide();
    $("#numChild_ceix").val("");
  }
}
function parity_ovry() {
  let parityValue = parseInt($("#parity_ovry").val(), 10);
  if (parityValue > 15) {
    parityValue = 0;
    $("#parity_ovry").val(parityValue);
  } else if (parityValue < 0) {
    parityValue = 0;
    $("#parity_ovry").val(parityValue);
  }

  if (parityValue > 0) {
    $("#noChild_ovry").show();
  } else {
    $("#noChild_ovry").hide();
    $("#numChild_ovry").val("");
  }
}
parity_ovry();
$("#parity_ovry").on("input", function () {
  parity_ovry();
});
function breFd_ovry() {
  if ($("#breFdYes_ovry").is(":checked")) {
    $("#durFeed_ovry").show();
  } else {
    $("#durFeed_ovry").hide();
    $("#dbf_ovry").val();
  }
}
function parity_endm() {
  let parityValue = parseInt($("#parity_endm").val(), 10);
  if (parityValue > 15) {
    parityValue = 0;
    $("#parity_endm").val(parityValue);
  } else if (parityValue < 0) {
    parityValue = 0;
    $("#parity_endm").val(parityValue);
  }

  if (parityValue > 0) {
    $("#noChild_endm").show();
  } else {
    $("#noChild_endm").hide();
    $("#numChild_endm").val("");
  }
}
function pbYes() {
  if ($("#pbYes").is(":checked")) {
    $("#PBN").show();
  } else {
    $("#PBN").hide();
    $("#PBInput").val("");
  }
}
function pbYes_ceix() {
  if ($("#pbYes_ceix").is(":checked")) {
    $("#PBN_ceix").show();
  } else {
    $("#PBN_ceix").hide();
    $("#PBInput_ceix").val("");
  }
}
function dcisY() {
  if ($("#dcisY").is(":checked")) {
    $("#dcisGradeSec").show();
  } else {
    $("#dcisGradeSec").hide();
    $("#dcisGrade").val("");
  }
}
function denovo() {
  if ($("#denovoYes").is(":checked")) {
  } else {
  }
}

function toggleMetastasisFields() {
  const isMetastasisSampleYes = $("#MetastasisSampleY").is(":checked");
  const isDenovoYes = $("#denovoYes").is(":checked");
  if (isMetastasisSampleYes) {
    $("#eventinfo").show();
  } else {
    $("#eventinfo").hide();
    $("#eventinfo").val();
  }

  if (isMetastasisSampleYes || isDenovoYes) {
    $("#mptA").show();
    $("#mptS").show();
    $("#mptRS").show();
  } else {
    $("#mptA").hide();
    $("#mptS").hide();
    $("#mptRS").hide();
    $("#mpt_age").val("");
    $("#mpt_site").val("");
    $("#mpt_rs").val("");
  }
}

function toggleDeathDate() {
  if ($("#radioDead").is(":checked")) {
    $("#deathDateContainer").show();
  } else {
    $("#deathDateContainer").hide();
  }
}

function searchLoadingModal() {
  document.getElementById("loading").style.display = "flex";
}

// function initialize() {
//   var surInfo = db.ref("doctors");
//   surInfo.once("value").then((snap) => {
//     if (snap.val() != null) {
//       const doctorsData = snap.val();

//       var surData = [];
//       surData.push("");
//       doctorsData.forEach((data) => {
//         surData.push(data);
//       });
//     }
//   });
// }

function updateTodoBadge(elementId) {
  const badge = document.getElementById(elementId);
  if (!badge) {
    console.log("Badge element not found");
    return;
  }
  let total = 0,
    pendingEntriesCount = 0,
    pendingFollowUpsCount = 0;
  if (elementId === "todoBadge") {
    pendingEntriesCount =
      localStorage.getItem("pendingEntriesCount") && localStorage.getItem("pendingEntriesCount") !== "null" && localStorage.getItem("pendingEntriesCount") !== "undefined"
        ? parseInt(localStorage.getItem("pendingEntriesCount"))
        : 0;
    pendingFollowUpsCount =
      localStorage.getItem("pendingFollowUpsCount") && localStorage.getItem("pendingFollowUpsCount") !== "null" && localStorage.getItem("pendingFollowUpsCount") !== "undefined"
        ? parseInt(localStorage.getItem("pendingFollowUpsCount"))
        : 0;
    total = pendingEntriesCount + pendingFollowUpsCount;
  } else if (elementId === "pendingEntriesBadge") {
    pendingEntriesCount =
      localStorage.getItem("pendingEntriesCount") && localStorage.getItem("pendingEntriesCount") !== "null" && localStorage.getItem("pendingEntriesCount") !== "undefined"
        ? parseInt(localStorage.getItem("pendingEntriesCount"))
        : 0;
    total = pendingEntriesCount;
  } else if (elementId === "pendingFollowUpsBadge") {
    pendingFollowUpsCount =
      localStorage.getItem("pendingFollowUpsCount") && localStorage.getItem("pendingFollowUpsCount") !== "null" && localStorage.getItem("pendingFollowUpsCount") !== "undefined"
        ? parseInt(localStorage.getItem("pendingFollowUpsCount"))
        : 0;
    total = pendingFollowUpsCount;
  }
  badge.textContent = total;
  badge.style.display = total > 0 ? "inline-block" : "none";
}
function getGender(g) {
  g = g.toLowerCase();
  switch (g) {
    case "f":
      return "Female";
    case "m":
      return "Male";
    case "o":
      return "Other";
    case "t":
      return "Transgender";
    default:
      return "-";
  }
}
function getCancerType(ct) {
  switch (ct) {
    case "ovry":
      return "Ovarian Cancer";
    case "ceix":
      return "Cervical Cancer";
    case "endm":
      return "Endometrial Cancer";
    case "brst":
      return "Breast Cancer";
    default:
      return "-";
  }
}
function fetchPendingEntries() {
  let rowsPerPage = 5; // Default number of rows to display per page
  let currentPage = 1; // Track the current page
  let totalPages = 1; // Total number of pages
  let tableData = []; // Holds the data to be paginated

  const pEntrySelect = document.getElementById("pEntry");
  if (!pEntrySelect) {
    console.warn('fetchPendingEntries: element with id="pEntry" not found; skipping listener and pagination setup.');
  }
  const sevenDaysInMinutes = 7 * 24 * 60;

  const currentTime = Date.now();

  db.ref("sef").once("value", (snapshot) => {
    const allData = snapshot.val();
    window.patientData = allData;

    if (allData) {
      Object.keys(allData).forEach((bioBankId) => {
        const sections = allData[bioBankId];
        Object.keys(sections).forEach((sectionKey) => {
          const section = sections[sectionKey];
          const timestamps = Object.keys(section);

          let timestamp = Number(timestamps[0]) * 1000;
          let newtimestamp = timestamps[timestamps.length - 1];

          const dataEntry = section[newtimestamp];

          const patient = dataEntry.ie || {};
          const differenceInMinutes = (currentTime - timestamp) / (60 * 1000);

          if (dataEntry && dataEntry?.md?.pst === "" && differenceInMinutes > sevenDaysInMinutes) {
            tableData.push({
              bioBankId: bioBankId,
              seq: sectionKey,
              age: dataEntry.ie.ag || "-",
              gender: getGender(dataEntry.ie.sx),
              cancerType: getCancerType(dataEntry.ie.ct),
              newtimestamp: newtimestamp,
            });
          }
        });
      });
    }
    totalPages = Math.ceil(tableData.length / rowsPerPage);
    localStorage.setItem("pendingEntriesCount", tableData.length);
    updateTodoBadge("todoBadge");
    updateTodoBadge("pendingEntriesBadge");
    displayPage(currentPage); // Display the first page when data is fetched
    setupPagination(); // Set up pagination controls
  });

  function displayPage(page) {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedData = tableData.slice(start, end);
    populateTable(paginatedData);
  }

  function setupPagination() {
    const paginationElement = document.getElementById("pEpage");
    if (paginationElement) paginationElement.innerHTML = "";
    const prevLi = document.createElement("li");
    prevLi.className = `page-item${currentPage === 1 ? " disabled" : ""}`;
    prevLi.innerHTML = `<a class="page-link" href="#">Previous</a>`;
    prevLi.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        displayPage(currentPage);
        setupPagination();
      }
    });
    if (paginationElement) paginationElement.appendChild(prevLi);
    const firstPageLi = document.createElement("li");
    firstPageLi.className = `page-item${currentPage === 1 ? " active" : ""}`;
    firstPageLi.innerHTML = `<a class="page-link" href="#">1</a>`;
    firstPageLi.addEventListener("click", () => {
      currentPage = 1;
      displayPage(currentPage);
      setupPagination();
    });
    if (paginationElement) paginationElement.appendChild(firstPageLi);
    if (currentPage > 2) {
      const ellipsisLi = document.createElement("li");
      ellipsisLi.className = "page-item disabled";
      ellipsisLi.innerHTML = `<span class="page-link">...</span>`;
      if (paginationElement) paginationElement.appendChild(ellipsisLi);
    }
    const pageRange = 1;
    const startPage = Math.max(2, currentPage - pageRange);
    const endPage = Math.min(totalPages - 1, currentPage + pageRange); // End at totalPages - 1 because last page is handled separately
    for (let i = startPage; i <= endPage; i++) {
      const pageLi = document.createElement("li");
      pageLi.className = `page-item${i === currentPage ? " active" : ""}`;
      pageLi.innerHTML = `<a class="page-link" href="#">${i}</a>`;
      pageLi.addEventListener("click", () => {
        currentPage = i;
        displayPage(currentPage);
        setupPagination();
      });
      if (paginationElement) paginationElement.appendChild(pageLi);
    }
    if (currentPage + pageRange < totalPages - 1) {
      const ellipsisLi = document.createElement("li");
      ellipsisLi.className = "page-item disabled";
      ellipsisLi.innerHTML = `<span class="page-link">...</span>`;
      if (paginationElement) paginationElement.appendChild(ellipsisLi);
    }
    if (totalPages > 1) {
      const lastPageLi = document.createElement("li");
      lastPageLi.className = `page-item${currentPage === totalPages ? " active" : ""}`;
      lastPageLi.innerHTML = `<a class="page-link" href="#">${totalPages}</a>`;
      lastPageLi.addEventListener("click", () => {
        currentPage = totalPages;
        displayPage(currentPage);
        setupPagination();
      });
      if (paginationElement) paginationElement.appendChild(lastPageLi);
    }
    const nextLi = document.createElement("li");
    nextLi.className = `page-item${currentPage === totalPages ? " disabled" : ""}`;
    nextLi.innerHTML = `<a class="page-link" href="#">Next</a>`;
    nextLi.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++;
        displayPage(currentPage);
        setupPagination();
      }
    });
    if (paginationElement) paginationElement.appendChild(nextLi);
  }

  function populateTable(data) {
    const tableBody = document.querySelector(".patientTableBody1");
    if (tableBody) tableBody.innerHTML = "";

    data.forEach((entry, index) => {
      const row = document.createElement("tr");
      row.classList.add("patientRow");

      const snoCell = document.createElement("th");
      snoCell.scope = "row";
      snoCell.className = "sno";
      snoCell.textContent = index + 1 + (currentPage - 1) * rowsPerPage;
      row.appendChild(snoCell);

      const bioBankIdCell = document.createElement("td");
      bioBankIdCell.className = "patientName";
      bioBankIdCell.textContent = entry.bioBankId;
      row.appendChild(bioBankIdCell);

      const ageCell = document.createElement("td");
      ageCell.className = "age";
      ageCell.textContent = entry.age;
      row.appendChild(ageCell);

      const genderCell = document.createElement("td");
      genderCell.className = "gender";
      genderCell.textContent = entry.gender;
      row.appendChild(genderCell);

      const cancerTypeCell = document.createElement("td");
      cancerTypeCell.className = "cancerType";
      cancerTypeCell.textContent = entry.cancerType;
      row.appendChild(cancerTypeCell);

      const actionCell = document.createElement("td");
      actionCell.className = "action";

      const editBtn = document.createElement("button");
      editBtn.classList.add("btn", "btn-primary", "btn-sm", "mr-2");
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => {
        const seq = entry.seq;
        const timestampKey = entry.newtimestamp;
        editPatient(entry.bioBankId, seq, timestampKey);
      });

      const viewPendingFormBtn = document.createElement("button");
      viewPendingFormBtn.classList.add("btn", "btn-info", "btn-sm", "mr-2");
      viewPendingFormBtn.textContent = "View";
      viewPendingFormBtn.addEventListener("click", () => {
        const seq = entry.seq;
        const timestampKey = entry.newtimestamp;
        viewPendingForm(entry.bioBankId, seq, timestampKey);
      });

      actionCell.appendChild(editBtn);
      actionCell.appendChild(viewPendingFormBtn);
      row.appendChild(actionCell);
      if (tableBody) tableBody.appendChild(row);
    });
  }
  if (pEntrySelect) {
    pEntrySelect.addEventListener("change", function () {
      rowsPerPage = parseInt(this.value, 10);
      totalPages = Math.ceil(tableData.length / rowsPerPage);
      currentPage = 1; // Reset to the first page after changing the rows per page
      displayPage(currentPage);
      setupPagination();
    });
  } else {
    console.warn('fetchPendingEntries: element with id="pEntry" not found; skipping rows per page change listener.');
  }
}

function viewPendingForm(bioBankId, seq, timestampKey) {
  if (window.patientData[bioBankId]) {
    handlePendingForm(bioBankId, seq, timestampKey);
  } else {
    console.error(`Patient data not found for bioBankId ${bioBankId}`);
  }
}

function handlePendingForm(bioBankId, seq, timestampKey) {
  const patientSeq = window.patientData[bioBankId];
  if (patientSeq && patientSeq[seq] && patientSeq[seq][timestampKey]) {
    const timestampData = patientSeq[seq][timestampKey];
    let viewT = "PendingView";

    pages_display(viewT, bioBankId, seq, timestampKey);
  } else {
    console.error(`Sequence ${seq} or timestampKey ${timestampKey} not found for patient ${bioBankId}`);
  }
}

function editPatient(bioBankId, seq, timestampKey) {
  if (!window.patientData[bioBankId]) {
    fetchPatientData(bioBankId)
      .then(() => {
        handleEditPatientData(bioBankId, seq, timestampKey);
      })
      .catch((error) => {
        console.error("Error fetching patient data:", error);
      });
  } else {
    handleEditPatientData(bioBankId, seq, timestampKey);
  }
}

function handleEditPatientData(bioBankId, seq, timestampKey) {
  const patientSeq = window.patientData[bioBankId];
  if (patientSeq && patientSeq[seq] && patientSeq[seq][timestampKey]) {
    const timestampData = patientSeq[seq][timestampKey];
    let editT = "PendingEdit";

    let user = sessionStorage.getItem("userName");

    let act = {
      mode: "e",
      user: user,
    };

    let refPath = `act/${bioBankId}/${seq}`;

    db.ref(refPath)
      .once("value")
      .then((snapshot) => {
        if (snapshot.exists()) {
          let data = snapshot.val();

          if (data.mode === "e" && data.user !== user) {
            alert(`This form is being edited by ${data.user} .Please try after sometime...`);
          } else {
            db.ref(refPath)
              .set(act)
              .then(() => {
                console.log("New act set, proceeding with pages_display.");
                pages_display(editT, bioBankId, seq, timestampKey);
              })
              .catch((error) => {
                console.error("Error setting new act: ", error);
              });
          }
        } else {
          db.ref(refPath)
            .set(act)
            .then(() => {
              console.log("Path not found, new act set. Proceeding with pages_display.");
              pages_display(editT, bioBankId, seq, timestampKey);
            })
            .catch((error) => {
              console.error("Error setting new act: ", error);
            });
        }
      })
      .catch((error) => {
        console.error("Error checking path in Firebase: ", error);
      });
  } else {
    console.error(`Sequence ${seq} or timestampKey ${timestampKey} not found for patient ${bioBankId}`);
  }
}

function fetchPendingFollowUps() {
  const db = firebase.database();

  const todayTimestamp = new Date().getTime();

  const pfwRef = db.ref("pfw");

  let rowsPerFPage = 5;
  let currentFPage = 1;
  let totalFPages = 1;

  let allPatientData = [];

  const selectEntries = document.getElementById("pfollow");
  if (selectEntries) {
    selectEntries.addEventListener("change", (event) => {
      rowsPerFPage = parseInt(event.target.value);
      totalFPages = Math.ceil(allPatientData.length / rowsPerFPage);
      currentFPage = 1;
      displayPage();
    });
  }

  const updatePagination = () => {
    const paginationList = document.getElementById("pFpage");
    if (paginationList) paginationList.innerHTML = "";

    const prevLi = document.createElement("li");
    prevLi.className = "page-item" + (currentFPage === 1 ? " disabled" : "");
    prevLi.innerHTML = `<a class="page-link" href="#">Previous</a>`;
    prevLi.addEventListener("click", () => {
      if (currentFPage > 1) {
        currentFPage--;
        displayPage();
      }
    });
    if (paginationList) paginationList.appendChild(prevLi);
    const pageRange = 2;
    const startPage = Math.max(1, currentFPage - pageRange);
    const endPage = Math.min(totalFPages, currentFPage + pageRange);
    if (startPage > 1) {
      const firstPageLi = document.createElement("li");
      firstPageLi.className = "page-item" + (1 === currentFPage ? " active" : "");
      firstPageLi.innerHTML = `<a class="page-link" href="#">1</a>`;
      firstPageLi.addEventListener("click", () => {
        currentFPage = 1;
        displayPage();
      });
      if (paginationList) paginationList.appendChild(firstPageLi);

      if (startPage > 2) {
        const ellipsisLi = document.createElement("li");
        ellipsisLi.className = "page-item disabled";
        ellipsisLi.innerHTML = `<span class="page-link">...</span>`;
        if (paginationList) paginationList.appendChild(ellipsisLi);
      }
    }
    for (let i = startPage; i <= endPage; i++) {
      const pageLi = document.createElement("li");
      pageLi.className = "page-item" + (i === currentFPage ? " active" : "");
      pageLi.innerHTML = `<a class="page-link" href="#">${i}</a>`;
      pageLi.addEventListener("click", () => {
        currentFPage = i;
        displayPage();
      });
      if (paginationList) paginationList.appendChild(pageLi);
    }
    if (endPage < totalFPages) {
      if (endPage < totalFPages - 1) {
        const ellipsisLi = document.createElement("li");
        ellipsisLi.className = "page-item disabled";
        ellipsisLi.innerHTML = `<span class="page-link">...</span>`;
        if (paginationList) paginationList.appendChild(ellipsisLi);
      }

      const lastPageLi = document.createElement("li");
      lastPageLi.className = "page-item" + (totalFPages === currentFPage ? " active" : "");
      lastPageLi.innerHTML = `<a class="page-link" href="#">${totalFPages}</a>`;
      lastPageLi.addEventListener("click", () => {
        currentFPage = totalFPages;
        displayPage();
      });
      if (paginationList) paginationList.appendChild(lastPageLi);
    }

    const nextLi = document.createElement("li");
    nextLi.className = "page-item" + (currentFPage === totalFPages ? " disabled" : "");
    nextLi.innerHTML = `<a class="page-link" href="#">Next</a>`;
    nextLi.addEventListener("click", () => {
      if (currentFPage < totalFPages) {
        currentFPage++;
        displayPage();
      }
    });
    if (paginationList) paginationList.appendChild(nextLi);
  };

  const displayPage = () => {
    const start = (currentFPage - 1) * rowsPerFPage;
    const end = start + rowsPerFPage;
    const currentFPageData = allPatientData.slice(start, end);

    const patientList2 = document.getElementById("patientList2");
    if (patientList2) patientList2.innerHTML = "";

    const table = document.createElement("table");
    table.classList.add("table", "table-striped", "table-bordered");

    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th scope="col">S.No</th>
        <th scope="col">Bio Bank ID</th>
        <th scope="col">Age</th>
        <th scope="col">Gender</th>
        <th scope="col">Type of Cancer</th>
        <!-- <th scope="col">Grade of Cancer</th> -->
        <th scope="col">Action</th>
      </tr>
    `;

    const tbody = document.createElement("tbody");

    if (currentFPageData.length > 0) {
      currentFPageData.forEach((patient, index) => {
        const row = document.createElement("tr");

        row.innerHTML = `
          <th scope="row">${start + index + 1}</th> 
          <td>${patient.biobankID || "-"}</td>
          <td>${patient.age}</td>
          <td>${patient.gender}</td>
          <td>${patient.type_of_cancer}</td>
          <!-- <td>${patient.grade_of_cancer}</td> -->
        `;

        const modCell = document.createElement("td");
        const entryBtn = document.createElement("button");
        entryBtn.classList.add("btn", "btn-primary", "btn-sm", "mr-2");
        entryBtn.textContent = "Follow-Up";
        entryBtn.addEventListener("click", () => {
          const entry = "EditFollowUps";
          pages_display(entry, patient.biobankID, patient.patientArrayKey, patient.latestTimestamp);
        });

        const viewBtn = document.createElement("button");
        viewBtn.classList.add("btn", "btn-info", "btn-sm");
        viewBtn.textContent = "View";
        viewBtn.addEventListener("click", () => {
          const entry = "ViewFollowUp";
          follow_pages_display(entry, patient.biobankID, patient.patientArrayKey, patient.latestTimestamp);
        });

        modCell.appendChild(entryBtn);
        modCell.appendChild(viewBtn);
        row.appendChild(modCell);
        tbody.appendChild(row);
      });
    }

    table.appendChild(thead);
    table.appendChild(tbody);
    if (patientList2) patientList2.appendChild(table);

    updatePagination();
  };

  const seennBiobanks = [];
  pfwRef.once("value").then((snapshot) => {
    const pfwData = snapshot.val();
    const brKeys = Object.keys(pfwData);

    brKeys.forEach((biobankID) => {
      if (seennBiobanks.includes(biobankID)) {
        return; // Skip if already processed
      }
      seennBiobanks.push(biobankID);
      const timestamp = pfwData[biobankID];

      const dateObj = new Date(timestamp);
      const formattedDate = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, "0")}-${dateObj.getDate().toString().padStart(2, "0")}`;

      if (timestamp < todayTimestamp) {
        const sefRef = db.ref(`sef/${biobankID}`).orderByKey().limitToLast(1);

        sefRef.once("value").then((sefSnapshot) => {
          const data = sefSnapshot.val();
          if (data) {
            const patientArrays = Object.keys(data);

            patientArrays.forEach((patientArrayKey) => {
              const patientArray = data[patientArrayKey];

              if (patientArray && typeof patientArray === "object") {
                const timestamps = Object.keys(patientArray);

                const latestTimestamp = Math.max(...timestamps.map((t) => parseInt(t)));
                const latestData = patientArray[latestTimestamp];

                if (latestData) {
                  const { ie, md } = latestData;

                  const patientData = {
                    biobankID,
                    age: ie.ag || "-",
                    gender: getGender(ie.sx),
                    type_of_cancer: getCancerType(ie.ct),
                    stage_of_cancer: ie.stc || "-",
                    patientArrayKey,
                    latestTimestamp,
                  };

                  allPatientData.push(patientData);
                }
              }
            });
          }
          totalFPages = Math.ceil(allPatientData.length / rowsPerFPage);
          localStorage.setItem("pendingFollowUpsCount", allPatientData.length);
          displayPage();
        });
      }
    });
  });
  updateTodoBadge("todoBadge");
  updateTodoBadge("pendingFollowUpsBadge");
}
