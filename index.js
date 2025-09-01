// Staging;
// const firebaseConfig = {
//   apiKey: "AIzaSyD1xIWztyMkS7v3Cozp5J0Dtvaa9JlF0BM",
//   authDomain: "bio-bank-staging.firebaseapp.com",
//   databaseURL: "https://bio-bank-staging-default-rtdb.firebaseio.com/",
//   projectId: "bio-bank-staging",
//   storageBucket: "bio-bank-staging.firebasestorage.app",
//   messagingSenderId: "1054710609145",
//   appId: "1:1054710609145:web:2afcbf429677d7ca42de28",
//   measurementId: "G-CKEH775B84",
// };

// development;
const firebaseConfig = {
  apiKey: "AIzaSyDIFI_4lVb7FJmKgzWMbq6ZfKcBwpj-K4E",
  authDomain: "biobank-development.firebaseapp.com",
  databaseURL: "https://biobank-development-default-rtdb.firebaseio.com",
  projectId: "biobank-development",
  storageBucket: "biobank-development.firebasestorage.app",
  messagingSenderId: "31278898937",
  appId: "1:31278898937:web:01f96df7a640d9c1410c28",
  measurementId: "G-B98TGR5Q8Q",
};

//deployment
//  const firebaseConfig = {
//    apiKey: "AIzaSyCbpb_1jb6mDvF_7kuN8J0lwIoW7-mKd8g",
//    authDomain: "bio-bank-deployment.firebaseapp.com",
//    databaseURL: "https://bio-bank-deployment-default-rtdb.firebaseio.com",
//    projectId: "bio-bank-deployment",
//    storageBucket: "bio-bank-deployment.firebasestorage.app",
//    messagingSenderId: "674946404975",
//    appId: "1:674946404975:web:777e4171f5b473e6b3f39a",
//    measurementId: "G-MQP97GW8F9",
//  };

let currentBloodBoxIndex = 0;
let boxKeys = [];

function populateBBData(debug) {
  const path = "bb/";
  console.log("");
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
        console.log("Active boxVal:", boxVal);
        db.ref("bn/" + boxVal)
          .once("value")
          .then((snapshot) => {
            if (snapshot.exists()) {
              const boxName = snapshot.val();

              console.log("Box Name for ID " + boxVal + ": " + boxName);
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
  console.log("inside populate BB labels - ", debug, " -- ", boxVal);
  const rows = "ABCDEFGHIJ";
  const cols = 10;

  const bioBankIds = Object.keys(data).map((key) => data[key].bioBankId);
  const sts = Object.keys(data).map((key) => data[key].status);
  const sample = Object.keys(data).map((key) => data[key].sampleType);

  console.log("sts", sts);
  console.log("sample", sample);

  if (bioBankIds.length < 100) {
    console.warn("Not enough bioBankIds available for the matrix.");
  }

  for (let row = 0; row < rows.length; row++) {
    for (let col = 1; col <= cols; col++) {
      const labelName = `label_B${rows[row]}${col}`;
      const labelElement = document.getElementById(labelName);
      const index = row * cols + (col - 1);

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
            console.log("Fetching data for:", labelName);

            const bioBankId = bioBankIds[index];
            const sampleType = sample[index];

            const dbRef = db.ref(`sef/${bioBankId}`);
            const snapshot = await dbRef.get();

            if (!snapshot.exists()) {
              console.log("No data found for bioBankId:", bioBankId);
              return;
            }

            const dbData = snapshot.val();
            console.log("dbData", dbData);

            Object.keys(dbData).forEach((seqNum) => {
              const seqData = dbData[seqNum];
              console.log("seqData", seqData);
              const latestTimestamp = Math.max(...Object.keys(seqData));

              const timestampData = seqData[latestTimestamp];
              console.log("Latest timestampData", timestampData);
              if ((sampleType === "Plasma" || sampleType === "MPlasma") && timestampData.ie.bpg) {
                const bpg = timestampData.ie.bpg;
                const boxName = bpg.split("/")[0];
                const bpgIndex1 = bpg.split("/")[1];
                console.log("bsgIndex1", bpgIndex1);

                if (bpgIndex1 && bpgIndex1.includes(getSeatLabel(index))) {
                  matchedData.push({
                    mode: "SearchView",
                    bioBankId,
                    seq: seqNum,
                    timestamp: latestTimestamp,
                  });
                  console.log("Matched:", {
                    mode: "SearchView",
                    bioBankId,
                    seqNum,
                    timestamp: latestTimestamp,
                  });
                }
              }

              if ((sampleType === "Serum" || sampleType === "MSerum") && timestampData.ie.bsg) {
                const bsg = timestampData.ie.bsg;
                console.log("bsg", bsg);
                console.log("bsgIndex1", getSeatLabel(index));
                const bsgIndex1 = bsg.split("/")[1]; // get index1
                console.log("bsgIndex1", bsgIndex1);

                if (bsgIndex1 && bsgIndex1.includes(getSeatLabel(index))) {
                  matchedData.push({
                    mode: "SearchView",
                    bioBankId,
                    seq: seqNum,
                    timestamp: latestTimestamp,
                  });
                  console.log("Matched:", {
                    mode: "SearchView",
                    bioBankId,
                    seqNum,
                    timestamp: latestTimestamp,
                  });
                }
              }

              if ((sampleType === "Buffy Coat" || sampleType === "MBuffy Coat") && timestampData.ie.bbcg) {
                const bbcg = timestampData.ie.bbcg;
                console.log("bbcg", bbcg);
                console.log("bbcgIndex1", getSeatLabel(index));
                const bbcgIndex1 = bbcg.split("/")[1];
                console.log("bbcgIndex1", bbcgIndex1);

                if (bbcgIndex1 && bbcgIndex1.includes(getSeatLabel(index))) {
                  matchedData.push({
                    mode: "SearchView",
                    bioBankId,
                    seq: seqNum,
                    timestamp: latestTimestamp,
                  });
                  console.log("Matched:", {
                    mode: "SearchView",
                    bioBankId,
                    seqNum,
                    timestamp: latestTimestamp,
                  });
                }
              }

              if ((sampleType === "Other" || sampleType === "MOther") && timestampData.ie.osg) {
                const osg = timestampData.ie.osg;
                console.log("osg", osg);
                console.log("osgIndex1", getSeatLabel(index));
                const osgIndex1 = osg.split("/")[1];
                console.log("osgIndex1", osgIndex1);

                if (osgIndex1 && osgIndex1.includes(getSeatLabel(index))) {
                  matchedData.push({
                    mode: "SearchView",
                    bioBankId,
                    seq: seqNum,
                    timestamp: latestTimestamp,
                  });
                  console.log("Matched:", {
                    mode: "SearchView",
                    bioBankId,
                    seqNum,
                    timestamp: latestTimestamp,
                  });
                }
              }
            });

            if (matchedData.length > 0) {
              console.log("Matched Data:", matchedData);
              matchedData.forEach((item) => {
                console.log(`Mode: ${item.mode}`);
                console.log(`BioBank ID: ${item.bioBankId}`);
                console.log(`Sequence: ${item.seq}`);
                console.log(`Timestamp: ${item.timestamp}`);
                pages_display(item.mode, item.bioBankId, item.seq, item.timestamp);
              });
            } else {
              console.log("No match found for:", matchedData.length);

              console.log("No match found for:", labelName);
            }
          });
        }

        if (sts[index] === "s") {
          newLabelElement.style.background = "rgb(180, 180, 180)";

          const matchedData = [];

          newLabelElement.addEventListener("click", async function () {
            console.log("Fetching data for:", labelName);

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
            console.log("dbData", dbData);

            Object.keys(dbData).forEach((seqNum) => {
              const seqData = dbData[seqNum];
              console.log("seqData", seqData);

              Object.keys(seqData).forEach((timestamp) => {
                const timestampData = seqData[timestamp];
                console.log("timestampData", timestampData);

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
                    console.log("Matched:", {
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seqNum,
                      timestamp,
                    });
                  }
                }
                if ((sampleType === "Serum" || sampleType === "MSerum") && timestampData.ie) {
                  const bsg = timestampData.ie.bsg;
                  console.log("bsg", bsg);
                  console.log("bsgIndex1", getSeatLabel(index));
                  const boxName = bsg.split("/")[0];
                  const bsgIndex1 = bsg.split("/")[1]; // get index1
                  console.log("bsgIndex1", bsgIndex1);

                  if (bsgIndex1 && bsgIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp,
                    });
                    console.log("Matched:", {
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seqNum,
                      timestamp,
                    });
                  }
                }
                if ((sampleType === "Buffy Coat" || sampleType === "MBuffy Coat") && timestampData.ie) {
                  const bbcg = timestampData.ie.bbcg;
                  console.log("bbcg", bbcg);
                  console.log("bbcgIndex1", getSeatLabel(index));
                  if (bbcg !== undefined) {
                    const boxName = bbcg.split("/")[0];
                    const bbcgIndex1 = bbcg.split("/")[1];
                    console.log("bbcgIndex1", bbcgIndex1);

                    if (bbcgIndex1 && bbcgIndex1.includes(getSeatLabel(index))) {
                      matchedData.push({
                        mode: "sharedView",
                        boxName,
                        bioBankId,
                        seq: seqNum,
                        timestamp,
                      });
                      console.log("Matched:", {
                        mode: "sharedView",
                        boxName,
                        bioBankId,
                        seqNum,
                        timestamp,
                      });
                    }
                  }
                }
                if ((sampleType === "Other" || sampleType === "MOther") && timestampData.ie) {
                  const osg = timestampData.ie.osg;
                  console.log("osg", osg);
                  console.log("osgIndex1", getSeatLabel(index));
                  const boxName = osg.split("/")[0];
                  const osgIndex1 = osg.split("/")[1];
                  console.log("osgIndex1", osgIndex1);

                  if (osgIndex1 && osgIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp,
                    });
                    console.log("Matched:", {
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seqNum,
                      timestamp,
                    });
                  }
                }
              });
            });

            if (matchedData.length > 0) {
              console.log("Matched Data:", matchedData);
              matchedData.forEach((item) => {
                console.log(`Mode: ${item.mode}`);
                console.log(`Box Name: ${item.boxName}`);
                console.log(`BioBank ID: ${item.bioBankId}`);
                console.log(`Sequence: ${item.seq}`);
                console.log(`Timestamp: ${item.timestamp}`);
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
            console.log("Fetching data for:", labelName);

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
            console.log("dbData", dbData);

            Object.keys(dbData).forEach((seqNum) => {
              const seqData = dbData[seqNum];
              console.log("seqData", seqData);

              Object.keys(seqData).forEach((timestamp) => {
                const timestampData = seqData[timestamp];
                console.log("timestampData", timestampData);

                if ((sampleType === "Plasma" || sampleType === "MPlasma") && timestampData.ie) {
                  const bpg = timestampData.ie.bpg;
                  console.log("bpg", bpg);

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
                      console.log("Matched:", {
                        mode: "sharedView",
                        boxName,
                        bioBankId,
                        seqNum,
                        timestamp,
                      });
                    }
                  }
                }
                if ((sampleType === "Serum" || sampleType === "MSerum") && timestampData.ie) {
                  const bsg = timestampData.ie.bsg;
                  console.log("bsg", bsg);
                  console.log("bsgIndex1", getSeatLabel(index));
                  const boxName = bsg.split("/")[0];
                  const bsgIndex1 = bsg.split("/")[1]; // get index1
                  console.log("bsgIndex1", bsgIndex1);

                  if (bsgIndex1 && bsgIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp,
                    });
                    console.log("Matched:", {
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seqNum,
                      timestamp,
                    });
                  }
                }
                if ((sampleType === "Buffy Coat" || sampleType === "MBuffy Coat") && timestampData.ie) {
                  const bbcg = timestampData.ie.bbcg;
                  console.log("bbcg", bbcg);
                  console.log("bbcgIndex1", getSeatLabel(index));
                  const boxName = bbcg.split("/")[0];
                  const bbcgIndex1 = bbcg.split("/")[1];
                  console.log("bbcgIndex1", bbcgIndex1);

                  if (bbcgIndex1 && bbcgIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp,
                    });
                    console.log("Matched:", {
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seqNum,
                      timestamp,
                    });
                  }
                }
                if ((sampleType === "Other" || sampleType === "MOther") && timestampData.ie) {
                  const osg = timestampData.ie.osg;
                  console.log("osg", osg);
                  console.log("osgIndex1", getSeatLabel(index));
                  const boxName = osg.split("/")[0];
                  const osgIndex1 = osg.split("/")[1];
                  console.log("osgIndex1", osgIndex1);

                  if (osgIndex1 && osgIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp,
                    });
                    console.log("Matched:", {
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seqNum,
                      timestamp,
                    });
                  }
                }
              });
            });

            if (matchedData.length > 0) {
              console.log("Matched Data:", matchedData);
              matchedData.forEach((item) => {
                console.log(`Mode: ${item.mode}`);
                console.log(`Box Name: ${item.boxName}`);
                console.log(`BioBank ID: ${item.bioBankId}`);
                console.log(`Sequence: ${item.seq}`);
                console.log(`Timestamp: ${item.timestamp}`);
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
            console.log("sts[index]", sts[index]);
            console.log("label name of clicked seat:", labelName);
            localStorage.removeItem("MRN");
            openModal();
          });
        }
      }
    }
  }
}

function getSeatLabel(index) {
  const rows = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  const cols = 10;

  const rowIndex = Math.floor(index / cols); // Get the row index (zero-based)
  const colIndex = index % cols; // Get the column index (zero-based)

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

  console.log("Hello Bhanu");
  setTimeout(() => {
    loadprogress.innerHTML = "";
    loadprogress.style.display = "none";

    container.style.display = "block";
  }, 1000);
}

function populateBBDataForCurrentBox() {
  const boxVal = boxKeys[currentBloodBoxIndex]; // Use the current index
  console.log("boxVal", boxVal);
  db.ref("bn/" + boxVal)
    .once("value")
    .then((snapshot) => {
      if (snapshot.exists()) {
        const boxName = snapshot.val();

        console.log("Box Name for ID " + boxVal + ": " + boxName);
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
        console.log("Bio Box Names in the BN node", boxIDs);

        let bnLocalS = [];

        for (const [key, value] of Object.entries(boxIDs)) {
          bnLocalS.push({ id: key, name: value });
        }
        localStorage.setItem("bnData", JSON.stringify(bnLocalS));

        console.log("Data stored in bnLocalS:", bnLocalS);
        console.log("Data stored in local storage.");
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
        console.log("boxVal", boxVal);

        db.ref("bn/" + boxVal)
          .once("value")
          .then((snapshot) => {
            if (snapshot.exists()) {
              const boxName = snapshot.val();

              console.log("Box Name for ID " + boxVal + ": " + boxName);
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

  console.log("sts", sts);
  console.log("sample", sample);

  if (bioBankIds.length < 100) {
    console.warn("Not enough bioBankIds available for the matrix.");
  }

  for (let row = 0; row < rows.length; row++) {
    for (let col = 1; col <= cols; col++) {
      const labelName = `label_S${rows[row]}${col}`;
      const labelElement = document.getElementById(labelName);
      const index = row * cols + (col - 1);

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
            console.log("Fetching data for:", labelName);

            const bioBankId = bioBankIds[index];
            const sampleType = sample[index];

            const dbRef = db.ref(`sef/${bioBankId}`);
            const snapshot = await dbRef.get();

            if (!snapshot.exists()) {
              console.log("No data found for bioBankId:", bioBankId);
              return;
            }

            const dbData = snapshot.val();
            console.log("dbData", dbData);

            Object.keys(dbData).forEach((seqNum) => {
              const seqData = dbData[seqNum];
              console.log("seqData", seqData);

              const latestTimestamp = Math.max(...Object.keys(seqData));

              const timestampData = seqData[latestTimestamp];
              console.log("Latest timestampData", timestampData);

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
                  console.log("Matched:", {
                    mode: "SearchView",
                    bioBankId,
                    seqNum,
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
                  console.log("Matched:", {
                    mode: "SearchView",
                    bioBankId,
                    seqNum,
                    timestamp: latestTimestamp,
                  });
                }
              }
            });

            if (matchedData.length > 0) {
              console.log("Matched Data:", matchedData);
              matchedData.forEach((item) => {
                console.log(`Mode: ${item.mode}`);
                console.log(`BioBank ID: ${item.bioBankId}`);
                console.log(`Sequence: ${item.seq}`);
                console.log(`Timestamp: ${item.timestamp}`);
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
            console.log("Fetching data for:", labelName);

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
            console.log("dbData", dbData);

            Object.keys(dbData).forEach((seqNum) => {
              const seqData = dbData[seqNum];
              console.log("seqData", seqData);

              Object.keys(seqData).forEach((timestamp) => {
                const timestampData = seqData[timestamp];
                console.log("timestampData", timestampData);

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
                    console.log("Matched:", {
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seqNum,
                      timestamp,
                    });
                  }
                }
                if ((sampleType.includes("FN") || sampleType.includes("MFN")) && timestampData.ie.fng) {
                  const fng = timestampData.ie.fng;
                  console.log("fng", fng);
                  console.log("fngIndex1", getSeatLabel(index));
                  const boxName = fng.split("/")[0];
                  const fngIndex1 = fng.split("/")[1]; // get index1
                  console.log("bsgIndex1", fngIndex1);

                  if (fngIndex1 && fngIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp,
                    });
                    console.log("Matched:", {
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seqNum,
                      timestamp,
                    });
                  }
                }
              });
            });

            if (matchedData.length > 0) {
              console.log("Matched Data:", matchedData);
              matchedData.forEach((item) => {
                console.log(`Mode: ${item.mode}`);
                console.log(`Box Name: ${item.boxName}`);
                console.log(`BioBank ID: ${item.bioBankId}`);
                console.log(`Sequence: ${item.seq}`);
                console.log(`Timestamp: ${item.timestamp}`);
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
            console.log("Fetching data for:", labelName);

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
            console.log("dbData", dbData);

            Object.keys(dbData).forEach((seqNum) => {
              const seqData = dbData[seqNum];
              console.log("seqData", seqData);

              Object.keys(seqData).forEach((timestamp) => {
                const timestampData = seqData[timestamp];
                console.log("timestampData", timestampData);

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
                    console.log("Matched:", {
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seqNum,
                      timestamp,
                    });
                  }
                }
                if ((sampleType.includes("FN") || sampleType.includes("MFN")) && timestampData.ie) {
                  const fng = timestampData.ie.fng;
                  console.log("fng", fng);
                  console.log("fngIndex1", getSeatLabel(index));
                  const boxName = fng.split("/")[0];
                  const fngIndex1 = fng.split("/")[1]; // get index1
                  console.log("bsgIndex1", fngIndex1);

                  if (fngIndex1 && fngIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp,
                    });
                    console.log("Matched:", {
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seqNum,
                      timestamp,
                    });
                  }
                }
              });
            });

            if (matchedData.length > 0) {
              console.log("Matched Data:", matchedData);
              matchedData.forEach((item) => {
                console.log(`Mode: ${item.mode}`);
                console.log(`Box Name: ${item.boxName}`);
                console.log(`BioBank ID: ${item.bioBankId}`);
                console.log(`Sequence: ${item.seq}`);
                console.log(`Timestamp: ${item.timestamp}`);
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
            console.log("sts[index]", sts[index]);
            console.log("label name of clicked seat:", labelName);
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

  console.log("Hello Bhanu");
  setTimeout(() => {
    loadprogress.innerHTML = "";
    loadprogress.style.display = "none";

    container.style.display = "block";
    populateSBDataForCurrentBox();
  }, 1000);
}

function populateSBDataForCurrentBox() {
  const boxVal = sBBoxKeys[currentSpecimenBoxIndex];
  console.log("boxVal", boxVal);

  db.ref("bn/" + boxVal)
    .once("value")
    .then((snapshot) => {
      if (snapshot.exists()) {
        const boxName = snapshot.val();

        console.log("Box Name for ID " + boxVal + ": " + boxName);
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
  console.log("");
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
        console.log("Active boxVal:", boxVal);
        db.ref("bn/" + boxVal)
          .once("value")
          .then((snapshot) => {
            if (snapshot.exists()) {
              const boxName = snapshot.val();

              console.log("Box Name for ID " + boxVal + ": " + boxName);
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
  console.log("inside populate BB labels - ", debug, " -- ", boxVal);
  const rows = "ABCDEFGHIJ";
  const cols = 10;

  const bioBankIds = Object.keys(data).map((key) => data[key].bioBankId);
  const sts = Object.keys(data).map((key) => data[key].status);
  const sample = Object.keys(data).map((key) => data[key].sampleType);

  console.log("sts", sts);
  console.log("sample", sample);

  if (bioBankIds.length < 100) {
    console.warn("Not enough bioBankIds available for the matrix.");
  }

  for (let row = 0; row < rows.length; row++) {
    for (let col = 1; col <= cols; col++) {
      const labelName = `label_R${rows[row]}${col}`;
      const labelElement = document.getElementById(labelName);
      const index = row * cols + (col - 1);

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
            console.log("Fetching data for:", labelName);

            const bioBankId = bioBankIds[index];
            const sampleType = sample[index];

            const dbRef = db.ref(`sef/${bioBankId}`);
            const snapshot = await dbRef.get();

            if (!snapshot.exists()) {
              console.log("No data found for bioBankId:", bioBankId);
              return;
            }

            const dbData = snapshot.val();
            console.log("dbData", dbData);

            Object.keys(dbData).forEach((seqNum) => {
              const seqData = dbData[seqNum];
              console.log("seqData", seqData);
              const latestTimestamp = Math.max(...Object.keys(seqData));

              const timestampData = seqData[latestTimestamp];
              console.log("Latest timestampData", timestampData);
              if ((sampleType === "RLT" || sampleType === "RLT") && timestampData.ie.rlt) {
                const rlt = timestampData.ie.rlt;
                const boxName = rlt.split("/")[0];
                const rltIndex1 = rlt.split("/")[1];
                console.log("rltIndex1", rltIndex1);

                if (rltIndex1 && rltIndex1.includes(getSeatLabel(index))) {
                  matchedData.push({
                    mode: "SearchView",
                    bioBankId,
                    seq: seqNum,
                    timestamp: latestTimestamp,
                  });
                  console.log("Matched:", {
                    mode: "SearchView",
                    bioBankId,
                    seqNum,
                    timestamp: latestTimestamp,
                  });
                }
              }
            });

            if (matchedData.length > 0) {
              console.log("Matched Data:", matchedData);
              matchedData.forEach((item) => {
                console.log(`Mode: ${item.mode}`);
                console.log(`BioBank ID: ${item.bioBankId}`);
                console.log(`Sequence: ${item.seq}`);
                console.log(`Timestamp: ${item.timestamp}`);
                pages_display(item.mode, item.bioBankId, item.seq, item.timestamp);
              });
            } else {
              console.log("No match found for:", matchedData.length);

              console.log("No match found for:", labelName);
            }
          });
        }

        if (sts[index] === "s") {
          newLabelElement.style.background = "rgb(180, 180, 180)";
          const matchedData = [];

          newLabelElement.addEventListener("click", async function () {
            console.log("Fetching data for:", labelName);

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
            console.log("dbData", dbData);

            Object.keys(dbData).forEach((seqNum) => {
              const seqData = dbData[seqNum];
              console.log("seqData", seqData);

              Object.keys(seqData).forEach((timestamp) => {
                const timestampData = seqData[timestamp];
                console.log("timestampData", timestampData);

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
                    console.log("Matched:", {
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seqNum,
                      timestamp,
                    });
                  }
                }
              });
            });

            if (matchedData.length > 0) {
              console.log("Matched Data:", matchedData);
              matchedData.forEach((item) => {
                console.log(`Mode: ${item.mode}`);
                console.log(`Box Name: ${item.boxName}`);
                console.log(`BioBank ID: ${item.bioBankId}`);
                console.log(`Sequence: ${item.seq}`);
                console.log(`Timestamp: ${item.timestamp}`);
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
            console.log("Fetching data for:", labelName);

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
            console.log("dbData", dbData);

            Object.keys(dbData).forEach((seqNum) => {
              const seqData = dbData[seqNum];
              console.log("seqData", seqData);

              Object.keys(seqData).forEach((timestamp) => {
                const timestampData = seqData[timestamp];
                console.log("timestampData", timestampData);

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
                    console.log("Matched:", {
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seqNum,
                      timestamp,
                    });
                  }
                }
              });
            });

            if (matchedData.length > 0) {
              console.log("Matched Data:", matchedData);
              matchedData.forEach((item) => {
                console.log(`Mode: ${item.mode}`);
                console.log(`Box Name: ${item.boxName}`);
                console.log(`BioBank ID: ${item.bioBankId}`);
                console.log(`Sequence: ${item.seq}`);
                console.log(`Timestamp: ${item.timestamp}`);
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
            console.log("sts[index]", sts[index]);
            console.log("label name of clicked seat:", labelName);
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
    loadRLTBox(); // Call loadBox to show the loading spinner
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
  console.log("hello");
  const container = document.getElementById("RLT-box-container");
  var loadprogress = document.getElementById("Rloadprogress");
  loadprogress.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Loading...
      `;
  loadprogress.style.display = "block";

  container.style.display = "none";

  console.log("Hello Bhanu");
  setTimeout(() => {
    loadprogress.innerHTML = "";
    loadprogress.style.display = "none";

    container.style.display = "block";
    populateRLTDataForCurrentBox();
  }, 1000);
}

function populateRLTDataForCurrentBox() {
  const boxVal = RLTboxKeys[currentRLTBoxIndex]; // Use the current index
  console.log("boxVal", boxVal);
  db.ref("bn/" + boxVal)
    .once("value")
    .then((snapshot) => {
      if (snapshot.exists()) {
        const boxName = snapshot.val();

        console.log("Box Name for ID " + boxVal + ": " + boxName);
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
  console.log("");
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
        console.log("Active boxVal:", boxVal);
        db.ref("bn/" + boxVal)
          .once("value")
          .then((snapshot) => {
            if (snapshot.exists()) {
              const boxName = snapshot.val();

              console.log("Box Name for ID " + boxVal + ": " + boxName);
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
  console.log("inside populate BB labels - ", debug, " -- ", boxVal);
  const rows = "ABCDEFGHIJ";
  const cols = 10;

  const bioBankIds = Object.keys(data).map((key) => data[key].bioBankId);
  const sts = Object.keys(data).map((key) => data[key].status);
  const sample = Object.keys(data).map((key) => data[key].sampleType);

  console.log("sts", sts);
  console.log("sample", sample);

  if (bioBankIds.length < 100) {
    console.warn("Not enough bioBankIds available for the matrix.");
  }

  for (let row = 0; row < rows.length; row++) {
    for (let col = 1; col <= cols; col++) {
      const labelName = `label_P${rows[row]}${col}`;
      const labelElement = document.getElementById(labelName);
      const index = row * cols + (col - 1);

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
            console.log("Fetching data for:", labelName);

            const bioBankId = bioBankIds[index];
            const sampleType = sample[index];

            const dbRef = db.ref(`sef/${bioBankId}`);
            const snapshot = await dbRef.get();

            if (!snapshot.exists()) {
              console.log("No data found for bioBankId:", bioBankId);
              return;
            }

            const dbData = snapshot.val();
            console.log("dbData", dbData);

            Object.keys(dbData).forEach((seqNum) => {
              const seqData = dbData[seqNum];
              console.log("seqData", seqData);
              const latestTimestamp = Math.max(...Object.keys(seqData));

              const timestampData = seqData[latestTimestamp];
              console.log("Latest timestampData", timestampData);
              if ((sampleType === "PC" || sampleType === "PC") && timestampData.ie.pc) {
                const pc = timestampData.ie.pc;
                const boxName = pc.split("/")[0];
                const pcIndex1 = pc.split("/")[1];
                console.log("pcIndex1", pcIndex1);

                if (pcIndex1 && pcIndex1.includes(getSeatLabel(index))) {
                  matchedData.push({
                    mode: "SearchView",
                    bioBankId,
                    seq: seqNum,
                    timestamp: latestTimestamp,
                  });
                  console.log("Matched:", {
                    mode: "SearchView",
                    bioBankId,
                    seqNum,
                    timestamp: latestTimestamp,
                  });
                }
              }
            });

            if (matchedData.length > 0) {
              console.log("Matched Data:", matchedData);
              matchedData.forEach((item) => {
                console.log(`Mode: ${item.mode}`);
                console.log(`BioBank ID: ${item.bioBankId}`);
                console.log(`Sequence: ${item.seq}`);
                console.log(`Timestamp: ${item.timestamp}`);
                pages_display(item.mode, item.bioBankId, item.seq, item.timestamp);
              });
            } else {
              console.log("No match found for:", matchedData.length);

              console.log("No match found for:", labelName);
            }
          });
        }

        if (sts[index] === "s") {
          newLabelElement.style.background = "rgb(180, 180, 180)";
          const matchedData = [];
          newLabelElement.addEventListener("click", async function () {
            console.log("Fetching data for:", labelName);

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
            console.log("dbData", dbData);

            Object.keys(dbData).forEach((seqNum) => {
              const seqData = dbData[seqNum];
              console.log("seqData", seqData);

              Object.keys(seqData).forEach((timestamp) => {
                const timestampData = seqData[timestamp];
                console.log("timestampData", timestampData);

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
                    console.log("Matched:", {
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seqNum,
                      timestamp,
                    });
                  }
                }
              });
            });

            if (matchedData.length > 0) {
              console.log("Matched Data:", matchedData);
              matchedData.forEach((item) => {
                console.log(`Mode: ${item.mode}`);
                console.log(`Box Name: ${item.boxName}`);
                console.log(`BioBank ID: ${item.bioBankId}`);
                console.log(`Sequence: ${item.seq}`);
                console.log(`Timestamp: ${item.timestamp}`);
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
            console.log("Fetching data for:", labelName);

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
            console.log("dbData", dbData);

            Object.keys(dbData).forEach((seqNum) => {
              const seqData = dbData[seqNum];
              console.log("seqData", seqData);

              Object.keys(seqData).forEach((timestamp) => {
                const timestampData = seqData[timestamp];
                console.log("timestampData", timestampData);

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
                    console.log("Matched:", {
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seqNum,
                      timestamp,
                    });
                  }
                }
              });
            });

            if (matchedData.length > 0) {
              console.log("Matched Data:", matchedData);
              matchedData.forEach((item) => {
                console.log(`Mode: ${item.mode}`);
                console.log(`Box Name: ${item.boxName}`);
                console.log(`BioBank ID: ${item.bioBankId}`);
                console.log(`Sequence: ${item.seq}`);
                console.log(`Timestamp: ${item.timestamp}`);
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
            console.log("sts[index]", sts[index]);
            console.log("label name of clicked seat:", labelName);
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
    loadPCBox(); // Call loadBox to show the loading spinner
    currentPCBoxIndex--;
    populatePCDataForCurrentBox();
  }
}

function next4Box() {
  if (currentPCBoxIndex < PCboxKeys.length - 1) {
    loadPCBox(); // Call loadBox to show the loading spinner
    currentPCBoxIndex++;
    populatePCDataForCurrentBox();
  }
}

function loadPCBox() {
  event.preventDefault();
  console.log("hello");
  const container = document.getElementById("Primary-box-container");
  var loadprogress = document.getElementById("Ploadprogress");
  loadprogress.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Loading...
      `;
  loadprogress.style.display = "block";

  container.style.display = "none";

  console.log("Hello Bhanu");
  setTimeout(() => {
    loadprogress.innerHTML = "";
    loadprogress.style.display = "none";

    container.style.display = "block";
    populatePCDataForCurrentBox();
  }, 1000);
}

function populatePCDataForCurrentBox() {
  const boxVal = PCboxKeys[currentPCBoxIndex]; // Use the current index
  console.log("boxVal", boxVal);
  db.ref("bn/" + boxVal)
    .once("value")
    .then((snapshot) => {
      if (snapshot.exists()) {
        const boxName = snapshot.val();

        console.log("Box Name for ID " + boxVal + ": " + boxName);
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
        boxKeys = Object.keys(boxes); // Populate boxKeys here
        console.log("boxKeys", boxKeys);
        const bloodB = boxKeys.findIndex((boxKey) => boxes[boxKey].bxsts === "AC");
        boxVal1 = boxKeys[bloodB];
        console.log("bloodB", boxVal1);
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
        boxKeys = Object.keys(boxes); // Populate boxKeys here
        const tissueB = boxKeys.findIndex((boxKey) => boxes[boxKey].bxsts === "AC");
        boxVal2 = boxKeys[tissueB];
        console.log("bloodB", boxVal2);
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
        console.log("bloodB", boxVal3);
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
        console.log("bloodB", boxVal4);
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
      newBoxData["bxsts"] = "AC"; // New box status is Active (AC)
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

            updatedOldBoxData["bxsts"] = "IAC"; // Mark the old box itself as Inactive (IAC)
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

function data() {
  db.ref("bb").once("value", (snapshot) => {
    const data = snapshot.val();
    console.log("All Data at bb:", data);
    if (data) {
      Object.keys(data).forEach((childKey) => {
        const childData = data[childKey];
        console.log(`Key: ${childKey}, Data:`, childData);
      });
    }
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
        console.log("form1Data.ie.fng", form1Data.ie.fng);
        console.log("form1Data.ie.ftg", form1Data.ie.ftg);
        let mode = localStorage.getItem("mode");

        let bS = localStorage.getItem("bloodVStatus");
        let tS = localStorage.getItem("specimenVStatus");
        let oS = localStorage.getItem("otherVStatus");
        let rltS = localStorage.getItem("rltVStatus");
        let pcV = localStorage.getItem("pcVVStatus");

        console.log("local shared bs: ", bS);
        console.log("local shared tS: ", tS);
        console.log("local shared oS: ", oS);
        console.log("local shared rltS: ", form1Data.ie.rlt);
        console.log("local shared rltS: ", rltS === "false");
        console.log("local shared rltS: ", form1Data.ie.rltS === "true");

        console.log("local shared pcV: ", pcV);

        console.log("Plasma data", form1Data.ie.bpg);
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
            console.log("local rltS: ", rltS);
            console.log("local rltS: ", form1Data.ie.rltS);
            updateRLT(form1Data.ie.rlt, "Search update RLT");
          }
          if (form1Data.ie.pc && (pcV === "No" || pcV === "Inprogress") && form1Data.ie.pcS === "true" && form1Data.ie.pssvl === "Yes") {
            console.log("local pcS: ", pcS);
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
          updateToFirebase(data);
        } else {
          saveToFirebase(data);
        } // Now add the switch case for the mode
        return data;
      }
    })
    .catch((error) => {
      console.error("Error during form validation:", error);
    });
}
function dateValidation() {
  const aRtimestamp = getDateAndTime("sampleReceivedDate", "sampleReceivedTime");
  const aPtimestamp = getDateAndTime("sampleProcessedDate", "sampleProcessedTime");
  const bRtimestamp = getDateAndTime("bloodSampleReceivedDate", "bloodSampleReceivedTime");
  const bPtimestamp = getDateAndTime("bloodSampleProcessedDate", "bloodSampleProcessedTime");
  const sRtimestamp = getDateAndTime("SpecimenSampleReceivedDate", "SpecimenSampleReceivedTime");
  const sPtimestamp = getDateAndTime("SpecimenSampleProcessedDate", "SpecimenSampleProcessedTime");
  const oRtimestamp = getDateAndTime("OtherSampleReceivedDate", "OtherSampleReceivedTime");
  const oPtimestamp = getDateAndTime("OtherSampleProcessedDate", "OtherSampleProcessedTime");
  const rRtimestamp = getDateAndTime("RLTSampleReceivedDate", "RLTSampleReceivedTime");
  const rPtimestamp = getDateAndTime("RLTSampleProcessedDate", "RLTSampleProcessedTime");
  const pRtimestamp = getDateAndTime("PCSampleReceivedDate", "PCSampleReceivedTime");
  const pPtimestamp = getDateAndTime("PCSampleProcessedDate", "PCSampleProcessedTime");

  console.log("Received timestamps: 56789", aRtimestamp, aPtimestamp, bRtimestamp, bPtimestamp, sRtimestamp, sPtimestamp, oRtimestamp, oPtimestamp, rRtimestamp, rPtimestamp, pRtimestamp, pPtimestamp);
  if (aRtimestamp && aPtimestamp && aRtimestamp > aPtimestamp) {
    alert("Sample Received Date and Time should be before Sample Processed Date and Time");
    return false;
  }
  if (bRtimestamp && bPtimestamp && bRtimestamp > bPtimestamp) {
    alert("Blood Sample Received Date and Time should be before Blood Sample Processed Date and Time");
    return false;
  }
  if (sRtimestamp && sPtimestamp && sRtimestamp > sPtimestamp) {
    alert("Blood Sample Received Date and Time should be before Blood Sample Processed Date and Time");
    return false;
  }
  if (oRtimestamp && oPtimestamp && oRtimestamp > oPtimestamp) {
    alert("Other Sample Received Date and Time should be before Other Sample Processed Date and Time");
    return false;
  }
  if (rRtimestamp && rPtimestamp && rRtimestamp > rPtimestamp) {
    alert("RLT Sample Received Date and Time should be before RLT Sample Processed Date and Time");
    return false;
  }
  if (pRtimestamp && pPtimestamp && pRtimestamp > pPtimestamp) {
    alert("PC Sample Received Date and Time should be before PC Sample Processed Date and Time");
    return false;
  }
  return true;
}
const getDateAndTime = (dateId, timeId) => {
  const dateValue = document.getElementById(dateId).value;
  const timeValue = document.getElementById(timeId).value;

  if (dateValue && timeValue) {
    const dateTimeString = `${dateValue}T${timeValue}`;
    const dateTime = new Date(dateTimeString);

    if (!isNaN(dateTime.getTime())) {
      return dateTime.getTime() / 1000; // Returns timestamp in milliseconds
    }
  }
  return null; // If invalid or empty, return null
};
function validateForm1() {
  const requiredFields = [
    { field: document.getElementById("mrnNo"), name: "MRN Number" },
    { field: document.getElementById("bioBankId"), name: "Bio Bank ID" },
    { field: document.getElementById("patAge"), name: "Age" },
    { field: document.querySelector('input[name="customRadio"]:checked'), name: "Gender" },
    { field: document.getElementById("cancer_type"), name: "Cancer Type" },
    { field: document.querySelector('input[name="customProcedure"]:checked'), name: "Procedure Types" },
    { field: document.querySelector('input[name="MetastasisSample"]:checked'), name: "Metastasis Sample" },
    { field: document.querySelector('input[name="bloodSample"]:checked'), name: "Blood Sample" },
    { field: document.querySelector('input[name="specimenSample"]:checked'), name: "Specimen Sample" },
    { field: document.querySelector('input[name="otherSample"]:checked'), name: "Other Sample" },
    { field: document.querySelector('input[name="rltSample"]:checked'), name: "RLT Sample" },
    { field: document.querySelector('input[name="pcbSample"]:checked'), name: "Primary Culture Sample" },
  ];

  let allFilled = true;
  let biochar = true;
  const emptyFields = [];

  requiredFields.forEach((item) => {
    if (!item.field || (item.field.type === "radio" && !item.field.checked) || (item.field.type === "number" && item.field.value === "")) {
      allFilled = false;
      emptyFields.push(item.name);
    }
  });
  if (!dateValidation()) return;
  const bioBankIdField = document.getElementById("bioBankId");
  const invalidCharacter = "/";

  if (bioBankIdField.value.includes(invalidCharacter)) {
    biochar = false;
    emptyFields.push('Bio Bank ID should not contain special character "/"');
  }

  let mode = localStorage.getItem("mode");

  console.log("mode", mode);
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

  const gridData = (gridValue) => {
    return new Promise((resolve) => {
      const gridVal = document.getElementById(gridValue).value;
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
              console.log("updatedgridNo", updatedgridNo);
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

  let proType = "";
  procType = document.querySelector('input[name="customProcedure"]:checked').value;
  metaType = document.querySelector('input[name="MetastasisSample"]:checked').value;

  if (procType === "b" && metaType === "false") {
    proType = "Bx";
  } else if (procType === "b" && metaType === "true") {
    proType = "MBx";
  } else if (procType === "r" && metaType === "false") {
    proType = "Sx";
  } else if (procType === "r" && metaType === "true") {
    proType = "MSx";
  }

  const aRtimestamp = getDateAndTime("sampleReceivedDate", "sampleReceivedTime");
  const aPtimestamp = getDateAndTime("sampleProcessedDate", "sampleProcessedTime");
  const bRtimestamp = getDateAndTime("bloodSampleReceivedDate", "bloodSampleReceivedTime");
  const bPtimestamp = getDateAndTime("bloodSampleProcessedDate", "bloodSampleProcessedTime");
  const sRtimestamp = getDateAndTime("SpecimenSampleReceivedDate", "SpecimenSampleReceivedTime");
  const sPtimestamp = getDateAndTime("SpecimenSampleProcessedDate", "SpecimenSampleProcessedTime");
  const oRtimestamp = getDateAndTime("OtherSampleReceivedDate", "OtherSampleReceivedTime");
  const oPtimestamp = getDateAndTime("OtherSampleProcessedDate", "OtherSampleProcessedTime");
  const rRtimestamp = getDateAndTime("RLTSampleReceivedDate", "RLTSampleReceivedTime");
  const rPtimestamp = getDateAndTime("RLTSampleProcessedDate", "RLTSampleProcessedTime");
  const pRtimestamp = getDateAndTime("PCSampleReceivedDate", "PCSampleReceivedTime");
  const pPtimestamp = getDateAndTime("PCSampleProcessedDate", "PCSampleProcessedTime");

  const plasmagrid = gridData("PlasmagridNo");
  const Serumgrid = gridData("SerumgridNo");
  const buffyCoatgrid = gridData("bufferCoatgridNo");
  const ftSgrid = gridData("ftgrid");
  const fnSgrid = gridData("fngrid");
  const rltSgrid = gridData("rltSgridNo");
  const pcSgrid = gridData("pcSgridNo");

  return Promise.all([
    gridData("PlasmagridNo"),
    gridData("SerumgridNo"),
    gridData("bufferCoatgridNo"),
    gridData("OSgridNo"),
    gridData("ftgrid"),
    gridData("fngrid"),
    gridData("rltSgridNo"),
    gridData("pcSgridNo"),
  ]).then(([plasmagrid, Serumgrid, buffyCoatgrid, otherSgrid, ftSgrid, fnSgrid, rltSgrid, pcSgrid]) => {
    const form1Data = {
      ie: {
        cnst: document.querySelector('input[name="customConsent"]:checked')?.value || "",
        ct: document.getElementById("cancer_type").value,
        ag: document.getElementById("patAge").value,
        sx: document.querySelector('input[name="customRadio"]:checked').value,
        tpr: document.querySelector('input[name="customProcedure"]:checked').value,
        dpr: document.getElementById("procedureDetail").value,
        srn: mode === "undefined" ? document.getElementById("surgeonName").value : document.getElementById("surgeonName1").value,
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
  });
}
function validateForm2() {
  let tL = document.getElementById("tumorSizeL").value;
  let tW = document.getElementById("tumorSizeW").value;
  let tH = document.getElementById("tumorSizeH").value;
  let tumorSize = `${tL}x${tW}x${tH}`;
  let ajcc1 = document.getElementById("AJCC1").value;
  let ajcc2 = document.getElementById("AJCC2").value;
  let ajcc = `${ajcc1}${ajcc2}`;

  const dropdownContainer = document.getElementById("cvSym");
  const medResults = [];

  const commandBlocks = dropdownContainer.getElementsByClassName("cmd");
  for (let i = 0; i < commandBlocks.length; i += 3) {
    const selectBlock = commandBlocks[i];
    const inputBlock = commandBlocks[i + 1];

    const selectElement = selectBlock.querySelector("select");
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

  console.log("medResults", medResults);

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
}
function validateForm3() {
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
}
function saveToFirebase(data) {
  const bioBankId = document.getElementById("bioBankId").value;
  const timestamp = Math.floor(Date.now() / 1000);

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
        alert("Form submitted successfully ");
      })
      .catch((error) => {
        console.error("Error writing to Firebase", error);
      });

    const mrnData = document.getElementById("mrnNo").value;
    db.ref(`bbnmrn/${mrnData}`)
      .set(bioBankId)
      .then(() => {
        console.log("stored in bbnmrn");
      })
      .catch((error) => {
        console.log("Not stored in bbnmrn");
      });

    const dueDate = new Date();
    const threeMonthInMinutes = 3 * 30 * 24 * 60; // Approximation of 3 months in minutes
    dueDate.setMinutes(dueDate.getMinutes() + threeMonthInMinutes);
    console.log("dueDate", dueDate);

    const bioBankPath = `pfw/${bioBankId}`;

    db.ref(bioBankPath)
      .once("value")
      .then((snapshot) => {
        if (snapshot.exists()) {
          console.log("Path already exists. Not storing in pfw.");
          let mode = localStorage.getItem("mode");
          switch (mode) {
            case "SearchView":
              window.location.href = `search.html`;
              break;
            case "SearchEdit":
              window.location.href = `search.html`;
              break;
            case "PendingView":
              window.location.href = `todo.html`;
              break;
            case "PendingEdit":
              window.location.href = `todo.html`;
              break;
            case "EditFollowUps":
              window.location.href = `todo.html`;
              break;
            case "ViewFollowUp":
              window.location.href = `todo.html`;
              break;
            case "undefined":
              window.location.href = `home.html`;
              break;
            default:
              console.error("Unknown mode:", mode);
          }
        } else {
          db.ref(bioBankPath)
            .set(dueDate.getTime()) // Store as Unix timestamp (milliseconds since 1970)
            .then(() => {
              console.log("Stored in pfw");
              let mode = localStorage.getItem("mode");
              switch (mode) {
                case "SearchView":
                  window.location.href = `search.html`;
                  break;
                case "SearchEdit":
                  window.location.href = `search.html`;
                  break;
                case "PendingView":
                  window.location.href = `todo.html`;
                  break;
                case "PendingEdit":
                  window.location.href = `todo.html`;
                  break;
                case "EditFollowUps":
                  window.location.href = `todo.html`;
                  break;
                case "ViewFollowUp":
                  window.location.href = `todo.html`;
                  break;
                case "undefined":
                  window.location.href = `home.html`;
                  break;
                default:
                  console.error("Unknown mode:", mode);
              }
            })
            .catch((error) => {
              console.log("Error storing in pfw:", error);
            });
        }
      })
      .catch((error) => {
        console.log("Error checking path existence:", error);
      });
  });
}

function updateToFirebase(data) {
  const bioBankId = document.getElementById("bioBankId").value;
  const timestamp = Math.floor(Date.now() / 1000);

  console.log("Hi Bhanu");

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
          if (mode === "SearchEdit" || mode === "PendingEdit") {
            db.ref(`act/${bioBankId}/${lastSection}`)
              .set(act)
              .then(() => {
                console.log("New act set, proceeding with pages_display.");
                validateAndCollectData();
              })
              .catch((error) => {
                console.error("Error setting new act: ", error);
              });
          } else {
            validateAndCollectData();
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

    const mrnData = document.getElementById("mrnNo").value;
    db.ref(`bbnmrn/${mrnData}`)
      .set(bioBankId)
      .then(() => {
        let mode = localStorage.getItem("mode");

        console.log("Stored in bbnmrn");
        switch (mode) {
          case "SearchView":
            window.location.href = `search.html`;
            break;
          case "SearchEdit":
            window.location.href = `search.html`;
            break;
          case "PendingView":
            window.location.href = `todo.html`;
            break;
          case "PendingEdit":
            window.location.href = `todo.html`;
            break;
          case "EditFollowUps":
            window.location.href = `todo.html`;
            break;
          case "ViewFollowUp":
            window.location.href = `todo.html`;
            break;
          case "undefined":
            window.location.href = `home.html`;
            break;

          default:
            console.error("Unknown mode:", mode);
        }
      })
      .catch((error) => {
        console.log("Not stored in bbnmrn");
      });
  });
}

function patients() {
  const bioBankId = document.getElementById("bioBankId").value;
  const timestamp = Math.floor(Date.now() / 1000); // Current timestamp

  let smtyArray = [];
  const bloodSampleSelected = document.getElementById("bloodSampleY").checked;
  const specimenSampleSelected = document.getElementById("specimenSampleY").checked;
  const otherSampleSelected = document.getElementById("otherSampleY").checked;
  const rltSampleSelected = document.getElementById("rltSampleY").checked;
  const pcbSampleSelected = document.getElementById("pcbSampleY").checked;
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
      age: document.getElementById("patAge").value, // Assuming 'patAge' is the age input field
      gndr: document.querySelector('input[name="customRadio"]:checked')?.value || "", // Gender
      ct: document.getElementById("cancer_type")?.value || "", // Type of Cancer
      grc: document.getElementById("sampleGrade")?.value || "", // Grade of Cancer
      smty: smty || "",
      typ: document.querySelector('input[name="customProcedure"]:checked').value, // Type of Procedure
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
  console.log("mode", mode);
  console.log("bioBankId", bioBankId);
  console.log("seq", seq);
  console.log("timestampKey", timestampKey);
  localStorage.setItem("bioBankId", bioBankId);
  localStorage.setItem("lastSection", seq);

  if (seq != "") {
    var dataPath = `sef/${bioBankId}/${seq}/${timestampKey}`;
  } else {
    var dataPath = `Fw/${bioBankId}/${timestampKey}`;
  }
  console.log("datapath", dataPath);
  console.log("DataConfig", db);

  localStorage.setItem("bioid", bioBankId);
  localStorage.setItem("mode", mode);

  sessionStorage.removeItem("formData");

  if (mode != "") {
    console.log("dataPath", dataPath);
    db.ref(dataPath)
      .once("value")
      .then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          console.log("Fetched data:", data);
          sessionStorage.setItem("formData", JSON.stringify(data));
          const storedData = sessionStorage.getItem("formData");
          if (storedData) {
            const parsedData = JSON.parse(storedData); // Convert it back to an object
            console.log("parsedData", parsedData); // Print the data to the console
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

async function fillIeForm(ieData) {
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
              console.log("updatedgridNo", updatedgridNo);
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

  const bioid = localStorage.getItem("bioid");
  console.log("bibioBankId", bioid);
  const bioidParts = bioid.match(/^([A-Za-z]+)(\d+)$/);
  if (bioidParts) {
    const prefix = bioidParts[1];
    let number = bioidParts[2];
    const paddedNumber = number.padStart(4, "0");
    document.getElementById("bioBankId").value = `${prefix}${paddedNumber}`;
  }
  if (ieData.cnst !== "") {
    document.querySelector(`input[name="customConsent"][value="${ieData.cnst}"]`).checked = true;
  }
  document.getElementById("cancer_type").value = ieData.ct || "";
  document.getElementById("patAge").value = ieData.ag || "";
  document.querySelector(`input[name="customRadio"][value="${ieData.sx}"]`).checked = true || "";
  console.log("cancer_type", document.getElementById("cancer_type"));
  document.querySelector(`input[name="customProcedure"][value="${ieData.tpr}"]`).checked = true;
  document.getElementById("procedureDetail").value = ieData.dpr || "";
  document.getElementById("surgeonName1").value = ieData.srn;
  console.log("surgeonName", document.getElementById("surgeonName"));
  document.querySelector(`input[name="MetastasisSample"][value="${ieData.mts}"]`).checked = true;
  document.getElementById("eventSelection").value = ieData.es;
  if (ieData.dm) document.querySelector(`input[name="denovo"][value="${ieData.dm}"]`).checked = true;
  document.getElementById("mpt_age").value = ieData.ag_ms || "";
  document.getElementById("mpt_site").value = ieData.site || "";
  document.getElementById("mpt_rs").value = ieData.rcpt || "";
  document.querySelector(`input[name="specimenSample"][value="${ieData.ss}"]`).checked = true;
  specimenSample();

  document.getElementById("ft_tubes").value = ieData.nft || "";

  const ftGridNo = await gridData(ieData.ftg);
  document.getElementById("ftgrid").value = ftGridNo || "";

  const fnGridNo = await gridData(ieData.fng);
  document.getElementById("fngrid").value = fnGridNo || "";
  document.getElementById("fn_tubes").value = ieData.nfn || "";
  document.querySelector(`input[name="bloodSample"][value="${ieData.bs}"]`).checked = true;
  bloodSample();

  const plasmaGridNo = await gridData(ieData.bpg);
  document.getElementById("PlasmagridNo").value = plasmaGridNo || ""; // Set the resolved value

  const SerumGridNo = await gridData(ieData.bsg);
  document.getElementById("SerumgridNo").value = SerumGridNo || "";

  const BuffyGridNo = await gridData(ieData.bbcg);
  document.getElementById("bufferCoatgridNo").value = BuffyGridNo || "";

  document.querySelector(`input[name="otherSample"][value="${ieData.osmp}"]`).checked = true;
  otherSample();

  const otherGridNo = await gridData(ieData.osg);
  document.getElementById("OSgridNo").value = otherGridNo || "";
  document.getElementById("otSampleDesc").value = ieData.osdsc || "";

  document.querySelector(`input[name="rltSample"][value="${ieData.rltS}"]`).checked = true;
  rltSample();

  const rltSgridNo = await gridData(ieData.rlt);
  document.getElementById("rltSgridNo").value = rltSgridNo || "";
  document.querySelector(`input[name="pcbSample"][value="${ieData.pcS}"]`).checked = true;
  console.log("pcbv", ieData.pssvl);
  if (ieData.pssvl !== undefined && ieData.pssvl !== "") document.querySelector(`input[name="pcbV"][value="${ieData.pssvl}"]`).checked = true;

  pcbSample();
  const pcSgridNo = await gridData(ieData.pc);
  document.getElementById("pcSgridNo").value = pcSgridNo || "";

  if (ieData.iss !== "") {
    document.querySelector(`input[name="IschemicRadio"][value="${ieData.iss}"]`).checked = true;
  }
  if (ieData.nact) document.querySelector(`input[name="NACT"][value="${ieData.nact}"]`).checked = true;
  NactYes();
  document.getElementById("nactEff").value = ieData.nactEff || "";
  document.getElementById("NACT_cycle").value = ieData.nactdc || "";
  document.getElementById("NACT_cycle_D").value = ieData.nactdlc || "";
  document.getElementById("processedBy").value = ieData.prb || "";
  if (ieData.scpt !== "") {
    document.querySelector(`input[name="processedRadio"][value="${ieData.scpt}"]`).checked = true;
  }
  sampleReceive();
  document.getElementById("BprocessedBy").value = ieData.bspb || "";
  document.getElementById("SprocessedBy").value = ieData.sspb || "";
  document.getElementById("OprocessedBy").value = ieData.ospb || "";
  document.getElementById("RLTprocessedBy").value = ieData.rltpb || "";
  document.getElementById("PCprocessedBy").value = ieData.psspb || "";

  document.getElementById("sefdataEB").value = ieData.sef_ub || "";

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return { date: "", time: "" };
    console.log("dateObj", timestamp);

    const dateObj = new Date(timestamp * 1000);
    console.log("dateObj", dateObj);
    const date = dateObj.toISOString().split("T")[0];
    const time = dateObj.toTimeString().split(" ")[0];
    return { date, time };
  };
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

function fillMdForm(mdData) {
  const formElements = [...document.querySelectorAll("input, select, textarea")];
  let mode = localStorage.getItem("mode");
  console.log("mode", mode);

  if (mdData.fhc !== "") {
    document.querySelector(`input[name="RadioFHabit"][value="${mdData.fhc}"]`).checked = true;
  }
  familyHabitToggle();
  document.getElementById("familyRelation").value = mdData.fhcr || "";
  document.getElementById("familyCancerType").value = mdData.fhct || "";

  if (mdData.fh) document.querySelector(`input[name="RadioFdHabit"][value="${mdData.fh}"]`).checked = true;
  if (mdData.hac) document.querySelector(`input[name="RadioAlcoholHabit"][value="${mdData.hac}"]`).checked = true;
  if (mdData.hs) document.querySelector(`input[name="RadioSmokeHabit"][value="${mdData.hs}"]`).checked = true;
  if (mdData.ec) document.querySelector(`input[name="ECH"][value="${mdData.ec}"]`).checked = true;
  document.getElementById("ffQcComments").value = mdData.ffqc || "";
  document.getElementById("ffTissueRemarks").value = mdData.ftr || "";
  if (mdData.tst) document.querySelector(`input[name="tumorSite"][value="${mdData.tst}"]`).checked = true;
  document.getElementById("tumorPercentage").value = mdData.tp || "";
  document.getElementById("ageAtDiagnosis").value = mdData.ad || "";
  document.getElementById("clinicalStage").value = mdData.cs || "";
  if (mdData.ihcm) document.querySelector(`input[name="IHC"][value="${mdData.ihcm}"]`).checked = true;
  IHCMarker();

  document.getElementById("IHC_Description").value = mdData.ihcd || "";
  if (mdData.gt) document.querySelector(`input[name="GeneticT"][value="${mdData.gt}"]`).checked = true;
  GeneticT();
  document.getElementById("gtr").value = mdData.gtr || "";
  document.getElementById("GT_Description").value = mdData.gtd || "";
  document.getElementById("subtype").value = mdData.pst || "";
  document.getElementById("pstOt").value = mdData.pstOt || "";
  document.getElementById("sampleGrade").value = mdData.gd || "";
  if (mdData.fc) document.querySelector(`input[name="focal"][value="${mdData.fc}"]`).checked = true;
  if (mdData.dcis) document.querySelector(`input[name="dcis"][value="${mdData.dcis}"]`).checked = true;
  document.getElementById("dcisGrade").value = mdData.dcisgd || "";
  if (mdData.lvi) document.querySelector(`input[name="LVI"][value="${mdData.lvi}"]`).checked = true;
  if (mdData.pni) document.querySelector(`input[name="PNI"][value="${mdData.pni}"]`).checked = true;
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
    const [tL, tW, tH] = mdData.tsz.split("x");

    document.getElementById("tumorSizeL").value = tL !== undefined ? tL : "";
    document.getElementById("tumorSizeW").value = tW !== undefined ? tW : "";
    document.getElementById("tumorSizeH").value = tH !== undefined ? tH : "";
  }
  document.getElementById("rcbScores").value = mdData.rcbs || "";
  document.getElementById("rcbClass").value = mdData.rcbc || "";

  if (mdData.act) document.querySelector(`input[name="ACT"][value="${mdData.act}"]`).checked = true;
  actYes();
  document.getElementById("actDrugCycles").value = mdData.actdc || "";
  document.getElementById("actDateLastCycle").value = mdData.actdls || "";
  if (mdData.rd) document.querySelector(`input[name="RadioT"][value="${mdData.rd}"]`).checked = true;
  RadioTYes();
  document.getElementById("rtDetails1").value = mdData.rdd1 || "";
  document.getElementById("rtDetails2").value = mdData.rdd2 || "";
  document.getElementById("rtDetails3").value = mdData.rdd3 || "";
  document.getElementById("radiotherapyLastCycleDate").value = mdData.rtdls || "";
  if (mdData.hrt) document.querySelector(`input[name="horT"][value="${mdData.hrt}"]`).checked = true;
  document.getElementById("hormone_Cycles").value = mdData.hrtD || "";
  if (mdData.trt) document.querySelector(`input[name="tarT"][value="${mdData.trt}"]`).checked = true;
  document.getElementById("Tar_Cycles").value = mdData.trtD || "";
  if (mdData.ipba) document.querySelector(`input[name="pbT"][value="${mdData.ipba}"]`).checked = true;
  document.getElementById("PBInput").value = mdData.ipbainfo || "";
  document.getElementById("mddataEB").value = mdData.mdu || "";

  if (mdData.cm) {
    let comMed = mdData.cm;
    const dropdownContainer = document.getElementById("cvSym");
    const keys = Object.keys(comMed);
    console.log("keys: ", keys);

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

function fillBrfForm(brfData) {
  document.getElementById("ageAtMenarche").value = brfData.am || "";
  document.getElementById("parity").value = brfData.pty || "";
  parity();
  document.getElementById("numChild").value = brfData.noc || "";
  document.getElementById("ageAtFirstChild").value = brfData.afc || "";
  if (brfData.bf) {
    document.querySelector(`input[name="breFd"][value="${brfData.bf}"]`).checked = true;
  }
  document.getElementById("dbf").value = brfData.dbf || "";
  if (brfData.ms) {
    document.querySelector(`input[name="mStatus"][value="${brfData.ms}"]`).checked = true;
  }
  if (brfData.er) {
    document.querySelector(`input[name="ERRadio"][value="${brfData.er}"]`).checked = true;
  }
  if (brfData.pr) {
    document.querySelector(`input[name="PRRadio"][value="${brfData.pr}"]`).checked = true;
  }
  if (brfData.h2) {
    console.log("brfData.h2: ", brfData.h2);
    document.querySelector(`input[name="HER2Radio"][value="${brfData.h2}"]`).checked = true;
  }
  document.getElementById("sbt").value = brfData.sbt || "";
  document.getElementById("pcsm").value = brfData.pcsm || "";
  document.getElementById("pcvm").value = brfData.pcvm || "";
  document.getElementById("k67").value = brfData.k67 || "";
  document.getElementById("HistologicalS").value = brfData.ht || "";
  document.getElementById("sps").value = brfData.sps || "";
  document.getElementById("brfdataEB").value = brfData.brfu || "";
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
        switch (mode) {
          case "SearchView":
            window.location.href = `search.html`;
            break;
          case "SearchEdit":
            window.location.href = `search.html`;
            break;
          case "PendingView":
            window.location.href = `todo.html`;
            break;
          case "PendingEdit":
            window.location.href = `todo.html`;
            break;
          case "EditFollowUps":
            window.location.href = `todo.html`;
            break;
          case "ViewFollowUp":
            window.location.href = `todo.html`;
            break;
          case "undefined":
            window.location.href = `home.html`;
            break;

          default:
            console.error("Unknown mode:", mode);
        }

        console.log("Followup data saved successfully");
      })
      .catch((error) => {
        console.error("Error saving followup data:", error);
      });

    const timePFW = new Date();
    console.log("time", timePFW);
    const threeMonthInMinutes = 3 * 30 * 24 * 60; // Approximation of 3 months in minutes
    timePFW.setMinutes(timePFW.getMinutes() + threeMonthInMinutes);

    const selectedStatus = document.querySelector('input[name="livestatus"]:checked').value;
    const lastfollow = document.querySelector('input[name="flexRadioDefault"]:checked').value;

    console.log("selectedStatus", selectedStatus);
    if (selectedStatus === "Dead" || lastfollow === "Lost_Follow" || lastfollow === "death_Dise" || lastfollow === "death_n_Dise") {
      db.ref(`pfw/${bioBankId}`)
        .remove()
        .then(() => {
          console.log("Data removed from pfw because Vital Status is Dead");
        })
        .catch((error) => {
          console.log("Error removing data from pfw:", error);
        });
    } else {
      db.ref(`pfw/${bioBankId}`)
        .set(timePFW.getTime())
        .then(() => {
          console.log("Stored in pfw");
        })
        .catch((error) => {
          console.log("Error storing in pfw:", error);
        });
    }
  } else if (!allFilled) {
    alert("Please enter all the required fields");
    return;
  }
}

function updateBB(info, field) {
  console.log("Plasma info", info);
  const parts = info.split("/");

  const bioBankId = document.getElementById("bioBankId").value;

  const boxName = parts[0].trim();
  const seatList = parts[1].split(",").map((seat) => seat.trim());
  const sampleType = parts[2].trim();

  console.log("bioBankId", bioBankId);
  if (!bioBankId) {
    console.error("No bioBankId found in localStorage");
    return;
  }

  console.log("Current seatList", seatList);

  db.ref(`bb/${boxName}`)
    .once("value")
    .then((snapshot) => {
      let box = snapshot.val();
      if (!box) {
        console.error(`No box found with the name: ${boxName}`);
        return;
      }

      seatList.forEach((seatID) => {
        let seatIndex = getSeatIndex(seatID);
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
  console.log("RLT info", info);
  console.log("RLT info field", field);

  const parts = info.split("/");

  const bioBankId = document.getElementById("bioBankId").value;

  const boxName = parts[0].trim();
  const seatList = parts[1].split(",").map((seat) => seat.trim());
  const sampleType = parts[2].trim();

  console.log("bioBankId", bioBankId);
  if (!bioBankId) {
    console.error("No bioBankId found in localStorage");
    return;
  }

  console.log("Current seatList", seatList);

  db.ref(`rlt/${boxName}`)
    .once("value")
    .then((snapshot) => {
      let box = snapshot.val();
      if (!box) {
        console.error(`No box found with the name: ${boxName}`);
        return;
      }

      seatList.forEach((seatID) => {
        let seatIndex = getSeatIndex(seatID);
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
  console.log("Primary Culture info", info);
  const parts = info.split("/");

  const bioBankId = document.getElementById("bioBankId").value;

  const boxName = parts[0].trim();
  const seatList = parts[1].split(",").map((seat) => seat.trim());
  const sampleType = parts[2].trim();

  console.log("bioBankId", bioBankId);
  if (!bioBankId) {
    console.error("No bioBankId found in localStorage");
    return;
  }

  console.log("Current seatList", seatList);

  db.ref(`pcb/${boxName}`)
    .once("value")
    .then((snapshot) => {
      let box = snapshot.val();
      if (!box) {
        console.error(`No box found with the name: ${boxName}`);
        return;
      }

      seatList.forEach((seatID) => {
        let seatIndex = getSeatIndex(seatID);
        const seatUpdate = {
          bioBankId: bioBankId,
          sampleType: sampleType,
          status: "o", // Mark as occupied
        };

        db.ref(`pcb/${boxName}/${seatIndex}`)
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

function getSeatIndex(seatID) {
  const rowLetter = seatID[0]; // e.g., 'B'
  const colNumber = seatID.slice(1); // e.g., '7'

  const rows = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  const cols = 10;

  const rowIndex = rows.indexOf(rowLetter); // Get the index of the row letter
  const colIndex = parseInt(colNumber) - 1; // Convert column number (1-based) to zero-based index

  return rowIndex * cols + colIndex; // Calculate the seat's position in the grid
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

  console.log("bioBankId", bioBankId);
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

      console.log("seatList", seatList);
      console.log("sampleTypes", sampleTypes);

      if (seatList.length !== sampleTypes.length) {
        console.error("The number of seats does not match the number of sample types.");
        return;
      }

      seatList.forEach((seatID, index) => {
        seatID = seatID.trim();
        const sampleType = sampleTypes[index].trim();
        console.log("seatID", seatID, "sampleType", sampleType);

        let seatIndex = getSeatIndex(seatID);

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
  console.log("Path", dataPath);
  document.getElementById("followUpCard").style.display = "block";
  document.getElementById("followForm").style.display = "none";
  db.ref(dataPath)
    .once("value")
    .then((snapshot) => {
      if (snapshot.exists()) {
        const followupData = snapshot.val();
        const container = document.querySelector(".card-followUp-container");
        container.innerHTML = "";
        console.log("Retrieved follow-up data:", followupData);
        const timestamps = Object.keys(followupData);
        followupDataStore = followupData;

        timestamps.forEach((timestamp) => {
          const date = new Date(Number(timestamp));
          console.log("timestamp", timestamp);
          console.log("date", date);
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
  console.log("follow Up data info: ", data);
  document.getElementById("followUpCard").style.display = "none";
  document.getElementById("followForm").style.display = "block";
  console.log("Displaying follow-up data:", data);
  document.querySelector(`input[name="flexRadioDefault"][value="${data.lfs}"]`).checked = true;
  document.getElementById("otherR").value = data.othrs || "";

  document.getElementById("startInputFollow").value = data.lfd || "";
  document.getElementById("lostFollowUpinfo").value = data.rlfw || "";
  document.getElementById("mFollowUp").value = data.mfu || "";

  document.getElementById("recurrenceDate").value = data.rd || "";
  document.getElementById("reportedDate").value = data.rdpd || "";
  document.getElementById("PET").value = data.pet || "";
  document.querySelector(`input[name="livestatus"][value="${data.vs}"]`).checked = true;
  document.querySelector(`input[name="treatStatus"][value="${data.tc}"]`).checked = true;
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
  console.log("Selected patients for sharing:", selectedPatients);

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
  console.log("bioboxName", bioboxName);

  fetchBoxIdFromBN(bioboxName)
    .then((boxId) => {
      if (!boxId) {
        console.log(`No box ID found for ${bioboxName}.`);
        return; // Exit if no box ID is found
      }
      fetchSeatDataFromDB("bb", boxId)
        .then((bbData) => {
          if (bbData) {
            console.log(`Box ID ${boxId} for '${bioboxName}' found in 'bb'.`);
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
            console.log(`Box ID ${boxId} for '${bioboxName}' found in 'sb'.`);
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
            console.log(`Box ID ${boxId} for '${bioboxName}' found in 'bb'.`);
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
            console.log(`Box ID ${boxId} for '${bioboxName}' found in 'bb'.`);
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
          console.log("bioinfo", bioInfo);
          console.log("box_id", box_id);
          console.log("seatData", seatData);
          console.log("box box_id", box_id);

          activeBoxEntry = Object.entries(seatData).find(([boxid, data]) => boxid === box_id);

          if (!activeBoxEntry) {
            console.log("No active box found.");
            return;
          }
          const [boxid, filteredSeats] = activeBoxEntry;
          let boxName = [];
          console.log("Active Box Name:", boxid);
          const indexedSeats = filteredSeats;

          db.ref("bn/" + boxid)
            .once("value")
            .then((snapshot) => {
              if (snapshot.exists()) {
                boxName = snapshot.val();

                console.log("Box Name for ID " + boxid + ": " + boxName);
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
                  const index = row * cols + (col - 1);

                  const seat = indexedSeats[index];

                  if (seat) {
                    container.insertAdjacentHTML(
                      "beforeend",
                      `<input type="checkbox" name="seats" id="${seatID}" />` + `<label for="${seatID}" class="viewSeat" id="${labelName}">${labelName}</label>`
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
                        console.log("seatID in sahred Box", gridSamples);

                        console.log("seatID in sahred Box", seatID);
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
          console.log("bioinfo", bioInfo);
          console.log("box_id", box_id);
          console.log("seatData", seatData);
          console.log("box box_id", box_id);

          activeBoxEntry = Object.entries(seatData).find(([boxid, data]) => boxid === box_id);

          if (!activeBoxEntry) {
            console.log("No active box found.");
            return;
          }
          const [boxid, filteredSeats] = activeBoxEntry;
          let boxName = [];
          console.log("Active Box Name:", boxid);
          const indexedSeats = filteredSeats;

          db.ref("bn/" + boxid)
            .once("value")
            .then((snapshot) => {
              if (snapshot.exists()) {
                boxName = snapshot.val();

                console.log("Box Name for ID " + boxid + ": " + boxName);
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
                  const index = row * cols + (col - 1);

                  const seat = indexedSeats[index];

                  if (seat) {
                    container.insertAdjacentHTML(
                      "beforeend",
                      `<input type="checkbox" name="seats" id="${seatID}" />` + `<label for="${seatID}" class="viewSeat" id="${labelName}">${labelName}</label>`
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
          console.log("bioinfo", bioInfo);
          console.log("box_id", box_id);
          console.log("seatData", seatData);
          console.log("box box_id", box_id);

          activeBoxEntry = Object.entries(seatData).find(([boxid, data]) => boxid === box_id);

          if (!activeBoxEntry) {
            console.log("No active box found.");
            return;
          }
          const [boxid, filteredSeats] = activeBoxEntry;
          let boxName = [];
          console.log("Active Box Name:", boxid);
          const indexedSeats = filteredSeats;

          db.ref("bn/" + boxid)
            .once("value")
            .then((snapshot) => {
              if (snapshot.exists()) {
                boxName = snapshot.val();

                console.log("Box Name for ID " + boxid + ": " + boxName);
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
                  const index = row * cols + (col - 1);

                  const seat = indexedSeats[index];

                  if (seat) {
                    container.insertAdjacentHTML(
                      "beforeend",
                      `<input type="checkbox" name="seats" id="${seatID}" />` + `<label for="${seatID}" class="viewSeat" id="${labelName}">${labelName}</label>`
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
                        console.log("seatID in sahred Box", gridSamples);

                        console.log("seatID in sahred Box", seatID);
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
          console.log("bioinfo", bioInfo);
          console.log("box_id", box_id);
          console.log("seatData", seatData);
          console.log("box box_id", box_id);

          activeBoxEntry = Object.entries(seatData).find(([boxid, data]) => boxid === box_id);

          if (!activeBoxEntry) {
            console.log("No active box found.");
            return;
          }
          const [boxid, filteredSeats] = activeBoxEntry;
          let boxName = [];
          console.log("Active Box Name:", boxid);
          const indexedSeats = filteredSeats;

          db.ref("bn/" + boxid)
            .once("value")
            .then((snapshot) => {
              if (snapshot.exists()) {
                boxName = snapshot.val();

                console.log("Box Name for ID " + boxid + ": " + boxName);
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
                  const index = row * cols + (col - 1);

                  const seat = indexedSeats[index];

                  if (seat) {
                    container.insertAdjacentHTML(
                      "beforeend",
                      `<input type="checkbox" name="seats" id="${seatID}" />` + `<label for="${seatID}" class="viewSeat" id="${labelName}">${labelName}</label>`
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
                        console.log("seatID in sahred Box", gridSamples);

                        console.log("seatID in sahred Box", seatID);
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
        console.log("Retrieved OutSource data:", outSourceData);
        const container = document.querySelector(".card-shared-container");
        container.innerHTML = "";
        Object.keys(outSourceData).forEach((seqNum) => {
          const seqData = outSourceData[seqNum];
          console.log("seqnum", seqData);
          const timestamps = Object.keys(seqData);
          console.log("Timestamps:", timestamps);
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
        console.log("Retrieved OutSource data:", outSourceData);

        Object.keys(outSourceData).forEach((seqNum) => {
          const seqData = outSourceData[seqNum];
          console.log("seqnum", seqData);

          const latestData = seqData[timestamp];
          console.log("latestData", latestData);

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
  console.log("mode", mode);
  console.log("bioBankId", bioBankId);
  console.log("seq", seq);
  console.log("timestampKey", timestampKey);
  console.log("boxName", boxName);
  localStorage.setItem("sharedBox", boxName);

  var dataPath = `Os/${bioBankId}/${seq}/`;

  console.log("datapath", dataPath);
  console.log("DataConfig", db);

  localStorage.setItem("bioid", bioBankId);
  localStorage.setItem("mode", mode);

  if (mode != "") {
    console.log("dataPath", dataPath);
    db.ref(dataPath)
      .once("value")
      .then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          console.log("Fetched data:", data);
          sessionStorage.setItem("sharedData", JSON.stringify(data));
          const storedData = sessionStorage.getItem("sharedData");
          if (storedData) {
            const parsedData = JSON.parse(storedData);
            console.log("parsedData", parsedData);
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
  console.log("mode", mode);
  console.log("bioBankId", bioBankId);

  var dataPath = `Fw/${bioBankId}/`;

  console.log("datapath", dataPath);
  console.log("DataConfig", db);

  localStorage.setItem("bioid", bioBankId);
  localStorage.setItem("mode", mode);

  if (mode != "") {
    console.log("dataPath", dataPath);
    db.ref(dataPath)
      .once("value")
      .then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          console.log("Fetched data:", data);
          sessionStorage.setItem("FollowData", JSON.stringify(data));
          const storedData = sessionStorage.getItem("FollowData");
          if (storedData) {
            const parsedData = JSON.parse(storedData);
            console.log("parsedData", parsedData);
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
  console.log("Displaying Outsource data:", data);
  document.querySelector(`input[name="sharestatus"][value="${data.ossts}"]`).checked = true;
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
  console.log("Bhanu", document.querySelector("#radioPartial").checked);

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
        console.log("Bio Box Names in the BN node", boxIDs);

        let bnLocalS = [];

        for (const [key, value] of Object.entries(boxIDs)) {
          bnLocalS.push({ id: key, name: value });
        }
        localStorage.setItem("bnData", JSON.stringify(bnLocalS));

        console.log("Data stored in bnLocalS:", bnLocalS);
        console.log("Data stored in local storage.");
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
  console.log("bloodSample", $("#bloodSampleY").is(":checked"));
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

function rltSample() {
  if ($("#rltSampleY").is(":checked")) {
    $("#rltSampleTubes").show();
  } else if ($("#rltSampleN").is(":checked")) {
    $("#rltSampleTubes").hide();
    $("#rltSgridNo").val("");
    localStorage.removeItem("LocalRltGrid");
    localStorage.removeItem("rltSelectedGrid");
  }
}

rltSample();
$('input[name="rltSample"]').change(function () {
  rltSample();
});

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
    localStorage.removeItem("LocalPC");
    localStorage.removeItem("pcSelectedGrid");
  }
}

pcbSample();
$('input[name="pcbSample"]').change(function () {
  pcbSample();
});

function pcbV() {
  if ($("#pcbVY").is(":checked")) {
    $("#pcbSampleTubes").show();
  } else {
    $("#pcbSampleTubes").hide();
    $("#pcSgridNo").val("");
    localStorage.removeItem("LocalPC");
    localStorage.removeItem("pcSelectedGrid");
  }
}

function sampleReceive() {
  console.log("Function checking", $("#radioprocessed1").is(":checked"), $("#radioprocessed2").is(":checked"));
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

function familyHabitToggle() {
  if ($("#familyHistoryCancer1").is(":checked")) {
    $("#relation_Cancer").show();
  } else {
    $("#relation_Cancer").hide();
    $("#familyRelation").val("");
    $("#familyCancerType").val("");
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
function IHCMarker() {
  if ($("#IHC_yes").is(":checked")) {
    $("#ihcDescr").show();
  } else {
    $("#ihcDescr").hide();
    $("#IHC_Description").val("");
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
function horTYes() {
  if ($("#horTYes").is(":checked")) {
    $("#horTD").show();
  } else {
    $("#horTD").hide();
    $("#hormone_Cycles").val("");
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

function pbYes() {
  if ($("#pbYes").is(":checked")) {
    $("#PBN").show();
  } else {
    $("#PBN").hide();
    $("#PBInput").val("");
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

function initialize() {
  var surInfo = db.ref("doctors");
  surInfo.once("value").then((snap) => {
    if (snap.val() != null) {
      const doctorsData = snap.val();
      console.log("snap", doctorsData);

      var surData = [];
      surData.push("");
      doctorsData.forEach((data) => {
        surData.push(data);
      });
    }
  });
}

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

function fetchPendingEntries() {
  let rowsPerPage = 5; // Default number of rows to display per page
  let currentPage = 1; // Track the current page
  let totalPages = 1; // Total number of pages
  let tableData = []; // Holds the data to be paginated

  const pEntrySelect = document.getElementById("pEntry");
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
          console.log(
            "Current Time:",
            currentTime,
            "Timestamp:",
            timestamp,
            "Difference in min:",
            differenceInMinutes,
            "3 min",
            sevenDaysInMinutes,
            "Condition:",
            differenceInMinutes > sevenDaysInMinutes,
            "Whole condition:",
            dataEntry && dataEntry?.md?.pst === "" && differenceInMinutes > sevenDaysInMinutes
          );

          if (dataEntry && dataEntry?.md?.pst === "" && differenceInMinutes > sevenDaysInMinutes) {
            tableData.push({
              bioBankId: bioBankId,
              seq: sectionKey,
              age: dataEntry.ie.ag || "-",
              gender: dataEntry.ie.sx === "F" ? "Female" : dataEntry.ie.sx === "M" ? "Male" : "Unknown",
              cancerType: dataEntry.ie.ct === "brst" ? "Breast Cancer" : "-",
              grade: dataEntry.md.gd.charAt(0).toUpperCase() + dataEntry.md.gd.slice(1) || "-",
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
    paginationElement.innerHTML = ""; // Clear pagination
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
    paginationElement.appendChild(prevLi);
    const firstPageLi = document.createElement("li");
    firstPageLi.className = `page-item${currentPage === 1 ? " active" : ""}`;
    firstPageLi.innerHTML = `<a class="page-link" href="#">1</a>`;
    firstPageLi.addEventListener("click", () => {
      currentPage = 1;
      displayPage(currentPage);
      setupPagination();
    });
    paginationElement.appendChild(firstPageLi);
    if (currentPage > 2) {
      const ellipsisLi = document.createElement("li");
      ellipsisLi.className = "page-item disabled";
      ellipsisLi.innerHTML = `<span class="page-link">...</span>`;
      paginationElement.appendChild(ellipsisLi);
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
      paginationElement.appendChild(pageLi);
    }
    if (currentPage + pageRange < totalPages - 1) {
      const ellipsisLi = document.createElement("li");
      ellipsisLi.className = "page-item disabled";
      ellipsisLi.innerHTML = `<span class="page-link">...</span>`;
      paginationElement.appendChild(ellipsisLi);
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
      paginationElement.appendChild(lastPageLi);
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
    paginationElement.appendChild(nextLi);
  }

  function populateTable(data) {
    const tableBody = document.querySelector(".patientTableBody1");
    tableBody.innerHTML = ""; // Clear previous table rows

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

      const gradeCell = document.createElement("td");
      gradeCell.className = "grade";
      gradeCell.textContent = entry.grade;
      row.appendChild(gradeCell);

      const actionCell = document.createElement("td");
      actionCell.className = "action";

      const editBtn = document.createElement("button");
      editBtn.classList.add("btn", "btn-primary", "btn-sm", "mr-2");
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => {
        console.log(`Editing patient: ${entry.bioBankId}`);
        const seq = entry.seq;
        const timestampKey = entry.newtimestamp;
        editPatient(entry.bioBankId, seq, timestampKey);
      });

      const viewPendingFormBtn = document.createElement("button");
      viewPendingFormBtn.classList.add("btn", "btn-info", "btn-sm", "mr-2");
      viewPendingFormBtn.textContent = "View";
      viewPendingFormBtn.addEventListener("click", () => {
        console.log(`Viewing pending form for patient: ${entry.bioBankId}`);
        const seq = entry.seq;
        const timestampKey = entry.newtimestamp;
        viewPendingForm(entry.bioBankId, seq, timestampKey);
      });

      actionCell.appendChild(editBtn);
      actionCell.appendChild(viewPendingFormBtn);
      row.appendChild(actionCell);
      tableBody.appendChild(row);
    });
  }
  pEntrySelect.addEventListener("change", function () {
    rowsPerPage = parseInt(this.value, 10);
    totalPages = Math.ceil(tableData.length / rowsPerPage);
    currentPage = 1; // Reset to the first page after changing the rows per page
    displayPage(currentPage);
    setupPagination();
  });
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
    console.log("timestampKey", timestampKey);
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
    console.log("timestampKey", timestampKey);

    let user = sessionStorage.getItem("userName");
    console.log("User Name", user);
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

          if (data.mode === "e") {
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
  console.log("todayTimestamp", todayTimestamp);

  const pfwRef = db.ref("pfw");

  let rowsPerFPage = 5;
  let currentFPage = 1;
  let totalFPages = 1;

  let allPatientData = [];

  const selectEntries = document.getElementById("pfollow");

  selectEntries.addEventListener("change", (event) => {
    rowsPerFPage = parseInt(event.target.value);
    totalFPages = Math.ceil(allPatientData.length / rowsPerFPage);
    currentFPage = 1;
    displayPage();
  });

  const updatePagination = () => {
    const paginationList = document.getElementById("pFpage");
    paginationList.innerHTML = "";

    const prevLi = document.createElement("li");
    prevLi.className = "page-item" + (currentFPage === 1 ? " disabled" : "");
    prevLi.innerHTML = `<a class="page-link" href="#">Previous</a>`;
    prevLi.addEventListener("click", () => {
      if (currentFPage > 1) {
        currentFPage--;
        displayPage();
      }
    });
    paginationList.appendChild(prevLi);
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
      paginationList.appendChild(firstPageLi);

      if (startPage > 2) {
        const ellipsisLi = document.createElement("li");
        ellipsisLi.className = "page-item disabled";
        ellipsisLi.innerHTML = `<span class="page-link">...</span>`;
        paginationList.appendChild(ellipsisLi);
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
      paginationList.appendChild(pageLi);
    }
    if (endPage < totalFPages) {
      if (endPage < totalFPages - 1) {
        const ellipsisLi = document.createElement("li");
        ellipsisLi.className = "page-item disabled";
        ellipsisLi.innerHTML = `<span class="page-link">...</span>`;
        paginationList.appendChild(ellipsisLi);
      }

      const lastPageLi = document.createElement("li");
      lastPageLi.className = "page-item" + (totalFPages === currentFPage ? " active" : "");
      lastPageLi.innerHTML = `<a class="page-link" href="#">${totalFPages}</a>`;
      lastPageLi.addEventListener("click", () => {
        currentFPage = totalFPages;
        displayPage();
      });
      paginationList.appendChild(lastPageLi);
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
    paginationList.appendChild(nextLi);
  };

  const displayPage = () => {
    const start = (currentFPage - 1) * rowsPerFPage;
    const end = start + rowsPerFPage;
    const currentFPageData = allPatientData.slice(start, end);

    const patientList2 = document.getElementById("patientList2");
    patientList2.innerHTML = "";

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
        <th scope="col">Grade of Cancer</th>
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
          <td>${patient.gender === "F" ? "Female" : patient.gender === "M" ? "Male" : "Unknown"}</td>
          <td>${patient.type_of_cancer}</td>
          <td>${patient.grade_of_cancer}</td>
        `;

        const modCell = document.createElement("td");
        const entryBtn = document.createElement("button");
        entryBtn.classList.add("btn", "btn-primary", "btn-sm", "mr-2");
        entryBtn.textContent = "Follow-Up";
        entryBtn.addEventListener("click", () => {
          console.log(`Entrying patient: ${patient.biobankID}`);
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
    patientList2.appendChild(table);

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
                    gender: ie.sx || "-",
                    type_of_cancer: ie.ct === "brst" ? "Breast Cancer" : "-",
                    stage_of_cancer: ie.stc || "-",
                    grade_of_cancer: md.gd.charAt(0).toUpperCase() + md.gd.slice(1) || "-",
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
          updateTodoBadge("todoBadge");
          updateTodoBadge("pendingFollowUpsBadge");
          displayPage();
        });
      }
    });
  });
}
