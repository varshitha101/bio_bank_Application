

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDIFI_4lVb7FJmKgzWMbq6ZfKcBwpj-K4E",
  authDomain: "biobank-development.firebaseapp.com",
  databaseURL: "https://biobank-development-default-rtdb.firebaseio.com",
  projectId: "biobank-development",
  storageBucket: "biobank-development.firebasestorage.app",
  messagingSenderId: "31278898937",
  appId: "1:31278898937:web:01f96df7a640d9c1410c28",
  measurementId: "G-B98TGR5Q8Q"
};

// Staging
// const firebaseConfig = {
//   apiKey: "AIzaSyD1xIWztyMkS7v3Cozp5J0Dtvaa9JlF0BM",
//   authDomain: "bio-bank-staging.firebaseapp.com",
//   databaseURL:"https://bio-bank-staging-default-rtdb.firebaseio.com/",
//   projectId: "bio-bank-staging",
//   storageBucket: "bio-bank-staging.firebasestorage.app",
//   messagingSenderId: "1054710609145",
//   appId: "1:1054710609145:web:2afcbf429677d7ca42de28",
//   measurementId: "G-CKEH775B84"
// };

// const firebaseConfig = {
//   apiKey: "AIzaSyCbpb_1jb6mDvF_7kuN8J0lwIoW7-mKd8g",
//   authDomain: "bio-bank-deployment.firebaseapp.com",
//   databaseURL: "https://bio-bank-deployment-default-rtdb.firebaseio.com",
//   projectId: "bio-bank-deployment",
//   storageBucket: "bio-bank-deployment.firebasestorage.app",
//   messagingSenderId: "674946404975",
//   appId: "1:674946404975:web:777e4171f5b473e6b3f39a",
//   measurementId: "G-MQP97GW8F9"
// };





// const app = firebase.initializeApp(firebaseConfig);
// const db = firebase.database(app);



let currentBloodBoxIndex = 0;
let boxKeys = [];

function populateBBData(debug) {
  const path = 'bb/';
  console.log("")
  var boxVal = '';
  db.ref(path).once('value')
    .then(snapshot => {
      const boxes = snapshot.val();
      if (boxes) {
        boxKeys = Object.keys(boxes); // Populate boxKeys here


        const activeBoxIndex = boxKeys.findIndex(boxKey => boxes[boxKey].bxsts === 'AC');

        if (activeBoxIndex !== -1) {
          currentBloodBoxIndex = activeBoxIndex;
        } else {
          console.warn('No active box found with bxsts = "AC".');
        }

        boxVal = boxKeys[currentBloodBoxIndex]; // Use the determined or default index
        console.log("Active boxVal:", boxVal);
        db.ref('bn/' + boxVal).once('value')
          .then((snapshot) => {
            if (snapshot.exists()) {
              const boxName = snapshot.val();

              console.log("Box Name for ID " + boxVal + ": " + boxName);
              document.getElementById('box_id').textContent = boxName;

            } else {
              console.log("No box found with ID " + boxVal);
            }
          })
          .catch((error) => {
            console.error("Error fetching box name for ID " + boxVal + ": ", error);
          });

        return db.ref(`bb/${boxVal}/`).once('value');
      } else {
        const container = document.getElementById('blood-box-container');
        container.innerHTML = `
       Add Box in to the container.
      `;
      }
    })
    .then(snapshot => {
      const data = snapshot.val();
      if (data) {
        populateBBLabels(data, boxVal, "call from populateBBData");
      }
    })
    .catch(error => {
      console.error('Error fetching data from Firebase:', error);
    });


}

function populateBBLabels(data, boxVal, debug) {
  console.log("inside populate BB labels - ", debug, " -- ", boxVal);
  const rows = 'ABCDEFGHIJ';
  const cols = 10;

  const bioBankIds = Object.keys(data).map(key => data[key].bioBankId);
  const sts = Object.keys(data).map(key => data[key].status);
  const sample = Object.keys(data).map(key => data[key].sampleType);

  console.log("sts", sts);
  console.log("sample", sample);

  if (bioBankIds.length < 100) {
    console.warn('Not enough bioBankIds available for the matrix.');
  }

  for (let row = 0; row < rows.length; row++) {
    for (let col = 1; col <= cols; col++) {
      const labelName = `label_B${rows[row]}${col}`;
      const labelElement = document.getElementById(labelName);
      const index = row * cols + (col - 1);

      if (labelElement) {
        if (bioBankIds[index] !== '') {
          labelElement.innerHTML = `${bioBankIds[index] || ''}<br>${sample[index] || ''}`;
          labelElement.style.fontWeight = "bold";
        }
        else if (bioBankIds[index] === '') {
          labelElement.innerHTML = `${'-'}<br>${'-'}`;
          // labelElement.style.color = "rgb(143, 218, 187)";
        }


        const newLabelElement = labelElement.cloneNode(true);
        labelElement.parentNode.replaceChild(newLabelElement, labelElement);

        if (sts[index] === "o") {
          newLabelElement.style.background = "rgb(129, 129, 192)";
          const matchedData = [];

          // Add click event for status "o"
          newLabelElement.addEventListener('click', async function () {
            console.log('Fetching data for:', labelName);

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

            Object.keys(dbData).forEach(seqNum => {
              const seqData = dbData[seqNum];
              console.log("seqData", seqData);

              // Get the latest timestamp
              const latestTimestamp = Math.max(...Object.keys(seqData));

              const timestampData = seqData[latestTimestamp];
              console.log("Latest timestampData", timestampData);

              // Process based on sampleType
              if ((sampleType === "Plasma" || sampleType === "MPlasma") && timestampData.ie.bpg) {
                const bpg = timestampData.ie.bpg;
                const boxName = bpg.split('/')[0];
                const bpgIndex1 = bpg.split('/')[1];
                console.log("bsgIndex1", bpgIndex1);

                if (bpgIndex1 && bpgIndex1.includes(getSeatLabel(index))) {
                  matchedData.push({
                    mode: "SearchView",
                    bioBankId,
                    seq: seqNum,
                    timestamp: latestTimestamp
                  });
                  console.log("Matched:", {
                    mode: "SearchView",
                    bioBankId,
                    seqNum,
                    timestamp: latestTimestamp
                  });
                }
              }

              if ((sampleType === "Serum" || sampleType === "MSerum") && timestampData.ie.bsg) {
                const bsg = timestampData.ie.bsg;
                console.log("bsg", bsg);
                console.log("bsgIndex1", getSeatLabel(index));
                const bsgIndex1 = bsg.split('/')[1]; // get index1
                console.log("bsgIndex1", bsgIndex1);

                if (bsgIndex1 && bsgIndex1.includes(getSeatLabel(index))) {
                  matchedData.push({
                    mode: "SearchView",
                    bioBankId,
                    seq: seqNum,
                    timestamp: latestTimestamp
                  });
                  console.log("Matched:", {
                    mode: "SearchView",
                    bioBankId,
                    seqNum,
                    timestamp: latestTimestamp
                  });
                }
              }

              if ((sampleType === "Buffy Coat" || sampleType === "MBuffy Coat") && timestampData.ie.bbcg) {
                const bbcg = timestampData.ie.bbcg;
                console.log("bbcg", bbcg);
                console.log("bbcgIndex1", getSeatLabel(index));
                const bbcgIndex1 = bbcg.split('/')[1];
                console.log("bbcgIndex1", bbcgIndex1);

                if (bbcgIndex1 && bbcgIndex1.includes(getSeatLabel(index))) {
                  matchedData.push({
                    mode: "SearchView",
                    bioBankId,
                    seq: seqNum,
                    timestamp: latestTimestamp
                  });
                  console.log("Matched:", {
                    mode: "SearchView",
                    bioBankId,
                    seqNum,
                    timestamp: latestTimestamp
                  });
                }
              }

              if ((sampleType === "Other" || sampleType === "MOther") && timestampData.ie.osg) {
                const osg = timestampData.ie.osg;
                console.log("osg", osg);
                console.log("osgIndex1", getSeatLabel(index));
                const osgIndex1 = osg.split('/')[1];
                console.log("osgIndex1", osgIndex1);

                if (osgIndex1 && osgIndex1.includes(getSeatLabel(index))) {
                  matchedData.push({
                    mode: "SearchView",
                    bioBankId,
                    seq: seqNum,
                    timestamp: latestTimestamp
                  });
                  console.log("Matched:", {
                    mode: "SearchView",
                    bioBankId,
                    seqNum,
                    timestamp: latestTimestamp
                  });
                }
              }
            });


            if (matchedData.length > 0) {
              console.log('Matched Data:', matchedData);
              matchedData.forEach(item => {
                console.log(`Mode: ${item.mode}`);
                console.log(`BioBank ID: ${item.bioBankId}`);
                console.log(`Sequence: ${item.seq}`);
                console.log(`Timestamp: ${item.timestamp}`);
                // Call your display function here
                pages_display(item.mode, item.bioBankId, item.seq, item.timestamp);
              });
            } else {
              console.log('No match found for:', matchedData.length);

              console.log('No match found for:', labelName);
            }
          });
        }

        if (sts[index] === "s") {
          newLabelElement.style.background = "rgb(180, 180, 180)";

          const matchedData = [];

          newLabelElement.addEventListener('click', async function () {
            console.log('Fetching data for:', labelName);

            const bioBankId = bioBankIds[index];
            const sampleType = sample[index];

            localStorage.setItem('sharedbioid', bioBankId);

            const dbRef = db.ref(`sef/${bioBankId}`);
            const snapshot = await dbRef.get();

            if (!snapshot.exists()) {
              console.log("No data found for bioBankId:", bioBankId);
              return;
            }

            const dbData = snapshot.val();
            console.log("dbData", dbData);

            Object.keys(dbData).forEach(seqNum => {
              const seqData = dbData[seqNum];
              console.log("seqData", seqData);

              Object.keys(seqData).forEach(timestamp => {
                const timestampData = seqData[timestamp];
                console.log("timestampData", timestampData);

                if (timestampData.ie) {
                  const bpg = timestampData.ie.bpg;
                  const boxName = bpg.split('/')[0];
                  const bpgIndex1 = bpg.split('/')[1];

                  if (bpgIndex1 && bpgIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp
                    });
                    console.log("Matched:", {
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seqNum,
                      timestamp
                    });
                  }
                }
                if ((sampleType === "Serum" || sampleType === "MSerum") && timestampData.ie) {
                  const bsg = timestampData.ie.bsg;
                  console.log("bsg", bsg);
                  console.log("bsgIndex1", getSeatLabel(index));
                  const boxName = bsg.split('/')[0];
                  const bsgIndex1 = bsg.split('/')[1]; // get index1
                  console.log("bsgIndex1", bsgIndex1);

                  if (bsgIndex1 && bsgIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp
                    });
                    console.log("Matched:", {
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seqNum,
                      timestamp
                    });
                  }
                }
                if ((sampleType === "Buffy Coat" || sampleType === "MBuffy Coat") && timestampData.ie) {
                  const bbcg = timestampData.ie.bbcg;
                  console.log("bbcg", bbcg);
                  console.log("bbcgIndex1", getSeatLabel(index));
                  const boxName = bbcg.split('/')[0];
                  const bbcgIndex1 = bbcg.split('/')[1];
                  console.log("bbcgIndex1", bbcgIndex1);

                  if (bbcgIndex1 && bbcgIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp
                    });
                    console.log("Matched:", {
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seqNum,
                      timestamp
                    });
                  }
                }
                if ((sampleType === "Other" || sampleType === "MOther") && timestampData.ie) {
                  const osg = timestampData.ie.osg;
                  console.log("osg", osg);
                  console.log("osgIndex1", getSeatLabel(index));
                  const boxName = osg.split('/')[0];
                  const osgIndex1 = osg.split('/')[1];
                  console.log("osgIndex1", osgIndex1);

                  if (osgIndex1 && osgIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp
                    });
                    console.log("Matched:", {
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seqNum,
                      timestamp
                    });
                  }
                }

              });
            });

            if (matchedData.length > 0) {
              console.log('Matched Data:', matchedData);
              matchedData.forEach(item => {
                console.log(`Mode: ${item.mode}`);
                console.log(`Box Name: ${item.boxName}`);
                console.log(`BioBank ID: ${item.bioBankId}`);
                console.log(`Sequence: ${item.seq}`);
                console.log(`Timestamp: ${item.timestamp}`);
                shared_pages_display(item.mode, item.bioBankId, item.seq, item.boxName, item.timestamp);
              });
            } else {
              console.log('No match found for:', labelName);
            }
          });
        }

        if (sts[index] === "ps") {
          newLabelElement.style.background = "rgb(193, 154, 107)";
          const matchedData = [];

          newLabelElement.addEventListener('click', async function () {
            console.log('Fetching data for:', labelName);

            const bioBankId = bioBankIds[index];
            const sampleType = sample[index];

            localStorage.setItem('sharedbioid', bioBankId);

            const dbRef = db.ref(`sef/${bioBankId}`);
            const snapshot = await dbRef.get();

            if (!snapshot.exists()) {
              console.log("No data found for bioBankId:", bioBankId);
              return;
            }

            const dbData = snapshot.val();
            console.log("dbData", dbData);

            Object.keys(dbData).forEach(seqNum => {
              const seqData = dbData[seqNum];
              console.log("seqData", seqData);

              Object.keys(seqData).forEach(timestamp => {
                const timestampData = seqData[timestamp];
                console.log("timestampData", timestampData);

                if ((sampleType === "Plasma" || sampleType === "MPlasma") && timestampData.ie) {
                  const bpg = timestampData.ie.bpg;
                  const boxName = bpg.split('/')[0];
                  const bpgIndex1 = bpg.split('/')[1];

                  if (bpgIndex1 && bpgIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp
                    });
                    console.log("Matched:", {
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seqNum,
                      timestamp
                    });
                  }
                }
                if ((sampleType === "Serum" || sampleType === "MSerum") && timestampData.ie) {
                  const bsg = timestampData.ie.bsg;
                  console.log("bsg", bsg);
                  console.log("bsgIndex1", getSeatLabel(index));
                  const boxName = bsg.split('/')[0];
                  const bsgIndex1 = bsg.split('/')[1]; // get index1
                  console.log("bsgIndex1", bsgIndex1);

                  if (bsgIndex1 && bsgIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp
                    });
                    console.log("Matched:", {
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seqNum,
                      timestamp
                    });
                  }
                }
                if ((sampleType === "Buffy Coat" || sampleType === "MBuffy Coat") && timestampData.ie) {
                  const bbcg = timestampData.ie.bbcg;
                  console.log("bbcg", bbcg);
                  console.log("bbcgIndex1", getSeatLabel(index));
                  const boxName = bbcg.split('/')[0];
                  const bbcgIndex1 = bbcg.split('/')[1];
                  console.log("bbcgIndex1", bbcgIndex1);

                  if (bbcgIndex1 && bbcgIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp
                    });
                    console.log("Matched:", {
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seqNum,
                      timestamp
                    });
                  }
                }
                if ((sampleType === "Other" || sampleType === "MOther") && timestampData.ie) {
                  const osg = timestampData.ie.osg;
                  console.log("osg", osg);
                  console.log("osgIndex1", getSeatLabel(index));
                  const boxName = osg.split('/')[0];
                  const osgIndex1 = osg.split('/')[1];
                  console.log("osgIndex1", osgIndex1);

                  if (osgIndex1 && osgIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp
                    });
                    console.log("Matched:", {
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seqNum,
                      timestamp
                    });
                  }
                }

              });
            });

            if (matchedData.length > 0) {
              console.log('Matched Data:', matchedData);
              matchedData.forEach(item => {
                console.log(`Mode: ${item.mode}`);
                console.log(`Box Name: ${item.boxName}`);
                console.log(`BioBank ID: ${item.bioBankId}`);
                console.log(`Sequence: ${item.seq}`);
                console.log(`Timestamp: ${item.timestamp}`);
                shared_pages_display(item.mode, item.bioBankId, item.seq, item.boxName, item.timestamp);
              });
            } else {
              console.log('No match found for:', labelName);
            }
          });
        }

        if (sts[index] === "e") {
          newLabelElement.style.background = "rgb(143, 218, 187)";

          newLabelElement.addEventListener('click', function () {
            console.log("sts[index]", sts[index]);
            console.log('label name of clicked seat:', labelName);
            localStorage.removeItem("MRN");
            $('#exampleModalCenter').modal('show');
          });
        }

      }
    }
  }
}


function getSeatLabel(index) {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const cols = 10;

  const rowIndex = Math.floor(index / cols);    // Get the row index (zero-based)
  const colIndex = index % cols;                // Get the column index (zero-based)

  const rowLetter = rows[rowIndex];             // Get the corresponding row letter
  const colNumber = colIndex + 1;               // Convert zero-based index to 1-based column number

  return `${rowLetter}${colNumber}`;            // Return seat label (e.g., 'C6')
}


function prev1Box() {
  if (currentBloodBoxIndex > 0) {
    loadBBox();  // Call loadBox to show the loading spinner
    currentBloodBoxIndex--;
    populateBBDataForCurrentBox();
  }
}

function next1Box() {
  if (currentBloodBoxIndex < boxKeys.length - 1) {
    loadBBox();  // Call loadBox to show the loading spinner
    currentBloodBoxIndex++;
    populateBBDataForCurrentBox();
  }
}


// function loadBox() {

//   const load = document.getElementById('loadprogress');

//   load.style.display = "block"

//   console.log("Hello Bhanu");
//   setTimeout(() => {
//     load.style.display = "none"
//     populateBBDataForCurrentBox();
//   }, 500);
// }


function loadBBox() {
  event.preventDefault();

  const container = document.getElementById('blood-box-container');
  var loadprogress = document.getElementById('Bloadprogress');
  loadprogress.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Loading...
      `;
  loadprogress.style.display = "block"

  container.style.display = "none"

  console.log("Hello Bhanu");
  setTimeout(() => {
    loadprogress.innerHTML = '';
    loadprogress.style.display = "none"

    container.style.display = "block"
    // populateBBDataForCurrentBox();
  }, 1000);
}




function populateBBDataForCurrentBox() {
  const boxVal = boxKeys[currentBloodBoxIndex]; // Use the current index
  console.log("boxVal", boxVal);

  // document.getElementById('box_id').textContent = boxVal;
  db.ref('bn/' + boxVal).once('value')
    .then((snapshot) => {
      if (snapshot.exists()) {
        const boxName = snapshot.val();

        console.log("Box Name for ID " + boxVal + ": " + boxName);
        document.getElementById('box_id').textContent = boxName;

      } else {
        console.log("No box found with ID " + boxVal);
      }
    })
    .catch((error) => {
      console.error("Error fetching box name for ID " + boxVal + ": ", error);
    });
  db.ref(`bb/${boxVal}/`).once('value')
    .then(snapshot => {
      const data = snapshot.val();
      if (data) {
        populateBBLabels(data, boxVal, "call from populateBBDataForCurrentBox");
      }
    })
    .catch(error => {
      console.error('Error fetching data from Firebase:', error);
    });
}

// // Initial call to populate the first box when the page loads
window.onload = function () {
  // window.onload = function () {
  // populateBBData(); // Populate the first box on page load
  //   populateBBData(); // Populate the first box on page load
  // fetchBnData();
  // };

  let bnLocalS = [];

  db.ref('bn/').once('value')
    .then((snapshot) => {
      if (snapshot.exists()) {
        const boxIDs = snapshot.val();
        console.log("Bio Box Names in the BN node", boxIDs);

        let bnLocalS = [];

        for (const [key, value] of Object.entries(boxIDs)) {
          bnLocalS.push({ id: key, name: value });
        }
        // bnLocalS = boxIDs;
        localStorage.setItem('bnData', JSON.stringify(bnLocalS));

        console.log("Data stored in bnLocalS:", bnLocalS);
        console.log("Data stored in local storage.");
      }
    })
    .catch((error) => {
      console.error('Error fetching data:', error);
    });
};




function test1() {
  populateBBData();
}




// function saveSBToFirebase() {

//   db.ref("sb").set(specimenDataArray)
//     .then(() => {
//       console.log("BBcaseDataArray successfully saved to Firebase.");
//     })
//     .catch((error) => {
//       console.error("Error saving data to Firebase: ", error);
//     });
// }




let currentSpecimenBoxIndex = 0;
let sBBoxKeys = [];

function populateSBData() {
  const path = 'sb/';

  db.ref(path).once('value')
    .then(snapshot => {
      const boxes = snapshot.val();
      if (boxes) {
        sBBoxKeys = Object.keys(boxes);


        const activeBoxIndex = sBBoxKeys.findIndex(sBBoxKeys => boxes[sBBoxKeys].bxsts === 'AC');

        if (activeBoxIndex !== -1) {
          currentSpecimenBoxIndex = activeBoxIndex;
        } else {
          console.warn('No active box found with bxsts = "AC".');
        }


        const boxVal = sBBoxKeys[currentSpecimenBoxIndex];
        console.log("boxVal", boxVal);

        db.ref('bn/' + boxVal).once('value')
          .then((snapshot) => {
            if (snapshot.exists()) {
              const boxName = snapshot.val();

              console.log("Box Name for ID " + boxVal + ": " + boxName);
              document.getElementById('sbox_id').textContent = boxName;

            } else {
              console.log("No box found with ID " + boxVal);
            }
          })
          .catch((error) => {
            console.error("Error fetching box name for ID " + boxVal + ": ", error);
          });

        return db.ref(`sb/${boxVal}/`).once('value');
      } else {
        const container = document.getElementById('specimen-box-container');
        container.innerHTML = `
       Add Box in to the container.
      `;
      }
    })
    .then(snapshot => {
      const data = snapshot.val();
      if (data) {
        populateSBLabels(data);
      }
    })
    .catch(error => {
      console.error('Error fetching data from Firebase:', error);
    });
}

function populateSBLabels(data) {
  const rows = 'ABCDEFGHIJ';
  const cols = 10;

  const bioBankIds = Object.keys(data).map(key => data[key].bioBankId);
  const sts = Object.keys(data).map(key => data[key].status);
  const sample = Object.keys(data).map(key => data[key].sampleType);

  console.log("sts", sts)
  console.log("sample", sample)


  if (bioBankIds.length < 100) {
    console.warn('Not enough bioBankIds available for the matrix.');
  }


  for (let row = 0; row < rows.length; row++) {
    for (let col = 1; col <= cols; col++) {
      const labelName = `label_S${rows[row]}${col}`;
      const labelElement = document.getElementById(labelName);
      const index = row * cols + (col - 1);

      if (labelElement) {
        if (bioBankIds[index] !== '') {
          labelElement.innerHTML = `${bioBankIds[index] || ''}<br>${sample[index] || ''}`;
          labelElement.style.fontWeight = "bold"
        }
        else if (bioBankIds[index] === '') {
          labelElement.innerHTML = `${'-'}<br>${'-'}`;
          // labelElement.style.color = "rgb(143, 218, 187)";
        }

        const newLabelElement = labelElement.cloneNode(true);
        labelElement.parentNode.replaceChild(newLabelElement, labelElement);

        if (sts[index] === "o") {
          newLabelElement.style.background = "rgb(129, 129, 192)";
          const matchedData = [];

          // Add click event for status "o"
          newLabelElement.addEventListener('click', async function () {
            console.log('Fetching data for:', labelName);

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

            Object.keys(dbData).forEach(seqNum => {
              const seqData = dbData[seqNum];
              console.log("seqData", seqData);

              const latestTimestamp = Math.max(...Object.keys(seqData));

              const timestampData = seqData[latestTimestamp];
              console.log("Latest timestampData", timestampData);

              if ((sampleType.includes('FT') || sampleType.includes('MFT')) && timestampData.ie.ftg) {
                const ftg = timestampData.ie.ftg;
                const boxName = ftg.split('/')[0];
                const ftgIndex1 = ftg.split('/')[1];

                if (ftgIndex1 && ftgIndex1.includes(getSeatLabel(index))) {
                  matchedData.push({
                    mode: "SearchView",
                    bioBankId,
                    seq: seqNum,
                    timestamp: latestTimestamp
                  });
                  console.log("Matched:", {
                    mode: "SearchView",
                    bioBankId,
                    seqNum,
                    timestamp: latestTimestamp
                  });
                }
              }

              if ((sampleType.includes('FN') || sampleType.includes('MFN')) && timestampData.ie.fng) {
                const fng = timestampData.ie.fng;
                const boxName = fng.split('/')[0];
                const fngIndex1 = fng.split('/')[1];

                if (fngIndex1 && fngIndex1.includes(getSeatLabel(index))) {
                  matchedData.push({
                    mode: "SearchView",
                    bioBankId,
                    seq: seqNum,
                    timestamp: latestTimestamp
                  });
                  console.log("Matched:", {
                    mode: "SearchView",
                    bioBankId,
                    seqNum,
                    timestamp: latestTimestamp
                  });
                }
              }


            });

            if (matchedData.length > 0) {
              console.log('Matched Data:', matchedData);
              matchedData.forEach(item => {
                console.log(`Mode: ${item.mode}`);
                console.log(`BioBank ID: ${item.bioBankId}`);
                console.log(`Sequence: ${item.seq}`);
                console.log(`Timestamp: ${item.timestamp}`);
                // Call your display function here
                pages_display(item.mode, item.bioBankId, item.seq, item.timestamp);
              });
            } else {
              console.log('No match found for:', labelName);
            }
          });
        }

        if (sts[index] === "s") {
          newLabelElement.style.background = "rgb(180, 180, 180)";
          const matchedData = [];

          newLabelElement.addEventListener('click', async function () {
            console.log('Fetching data for:', labelName);

            const bioBankId = bioBankIds[index];
            const sampleType = sample[index];

            localStorage.setItem('sharedbioid', bioBankId);

            const dbRef = db.ref(`sef/${bioBankId}`);
            const snapshot = await dbRef.get();

            if (!snapshot.exists()) {
              console.log("No data found for bioBankId:", bioBankId);
              return;
            }

            const dbData = snapshot.val();
            console.log("dbData", dbData);

            Object.keys(dbData).forEach(seqNum => {
              const seqData = dbData[seqNum];
              console.log("seqData", seqData);

              Object.keys(seqData).forEach(timestamp => {
                const timestampData = seqData[timestamp];
                console.log("timestampData", timestampData);

                if ((sampleType.includes('FT') || sampleType.includes('MFT')) && timestampData.ie.ftg) {
                  const ftg = timestampData.ie.ftg;
                  const boxName = ftg.split('/')[0];
                  const ftgIndex1 = ftg.split('/')[1];

                  if (ftgIndex1 && ftgIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp
                    });
                    console.log("Matched:", {
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seqNum,
                      timestamp
                    });
                  }
                }
                if ((sampleType.includes('FN') || sampleType.includes('MFN')) && timestampData.ie.fng) {
                  const fng = timestampData.ie.fng;
                  console.log("fng", fng);
                  console.log("fngIndex1", getSeatLabel(index));
                  const boxName = fng.split('/')[0];
                  const fngIndex1 = fng.split('/')[1]; // get index1
                  console.log("bsgIndex1", fngIndex1);

                  if (fngIndex1 && fngIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp
                    });
                    console.log("Matched:", {
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seqNum,
                      timestamp
                    });
                  }
                }


              });
            });

            if (matchedData.length > 0) {
              console.log('Matched Data:', matchedData);
              matchedData.forEach(item => {
                console.log(`Mode: ${item.mode}`);
                console.log(`Box Name: ${item.boxName}`);
                console.log(`BioBank ID: ${item.bioBankId}`);
                console.log(`Sequence: ${item.seq}`);
                console.log(`Timestamp: ${item.timestamp}`);
                shared_pages_display(item.mode, item.bioBankId, item.seq, item.boxName, item.timestamp);
              });
            } else {
              console.log('No match found for:', labelName);
            }
          });
        }
        if (sts[index] === "ps") {
          newLabelElement.style.background = "rgb(193, 154, 107)";
          const matchedData = [];

          newLabelElement.addEventListener('click', async function () {
            console.log('Fetching data for:', labelName);

            const bioBankId = bioBankIds[index];
            const sampleType = sample[index];

            localStorage.setItem('sharedbioid', bioBankId);

            const dbRef = db.ref(`sef/${bioBankId}`);
            const snapshot = await dbRef.get();

            if (!snapshot.exists()) {
              console.log("No data found for bioBankId:", bioBankId);
              return;
            }

            const dbData = snapshot.val();
            console.log("dbData", dbData);

            Object.keys(dbData).forEach(seqNum => {
              const seqData = dbData[seqNum];
              console.log("seqData", seqData);

              Object.keys(seqData).forEach(timestamp => {
                const timestampData = seqData[timestamp];
                console.log("timestampData", timestampData);

                if ((sampleType.includes('FT') || sampleType.includes('MFT')) && timestampData.ie) {
                  const ftg = timestampData.ie.ftg;
                  const boxName = ftg.split('/')[0];
                  const ftgIndex1 = ftg.split('/')[1];

                  if (ftgIndex1 && ftgIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp
                    });
                    console.log("Matched:", {
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seqNum,
                      timestamp
                    });
                  }
                }
                if ((sampleType.includes('FN') || sampleType.includes('MFN')) && timestampData.ie) {
                  const fng = timestampData.ie.fng;
                  console.log("fng", fng);
                  console.log("fngIndex1", getSeatLabel(index));
                  const boxName = fng.split('/')[0];
                  const fngIndex1 = fng.split('/')[1]; // get index1
                  console.log("bsgIndex1", fngIndex1);

                  if (fngIndex1 && fngIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp
                    });
                    console.log("Matched:", {
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seqNum,
                      timestamp
                    });
                  }
                }


              });
            });

            if (matchedData.length > 0) {
              console.log('Matched Data:', matchedData);
              matchedData.forEach(item => {
                console.log(`Mode: ${item.mode}`);
                console.log(`Box Name: ${item.boxName}`);
                console.log(`BioBank ID: ${item.bioBankId}`);
                console.log(`Sequence: ${item.seq}`);
                console.log(`Timestamp: ${item.timestamp}`);
                shared_pages_display(item.mode, item.bioBankId, item.seq, item.boxName, item.timestamp);
              });
            } else {
              console.log('No match found for:', labelName);
            }
          });
        }
        if (sts[index] === "e") {
          newLabelElement.style.background = "rgb(143, 218, 187)";

          newLabelElement.addEventListener('click', function () {
            console.log("sts[index]", sts[index]);
            console.log('label name of clicked seat:', labelName);
            $('#exampleModalCenter').modal('show');
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
    populateSBDataForCurrentBox()
  }
}

function next2Box() {
  if (currentSpecimenBoxIndex < sBBoxKeys.length - 1) {
    loadSBox();
    currentSpecimenBoxIndex++;
    populateSBDataForCurrentBox()
  }
}

function loadSBox() {
  event.preventDefault();

  const container = document.getElementById('specimen-box-container');
  var loadprogress = document.getElementById('Sloadprogress');
  loadprogress.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Loading...
      `;
  loadprogress.style.display = "block"

  container.style.display = "none"

  console.log("Hello Bhanu");
  setTimeout(() => {
    loadprogress.innerHTML = '';
    loadprogress.style.display = "none"

    container.style.display = "block"
    populateSBDataForCurrentBox();
  }, 1000);
}

function populateSBDataForCurrentBox() {
  const boxVal = sBBoxKeys[currentSpecimenBoxIndex];
  console.log("boxVal", boxVal);

  db.ref('bn/' + boxVal).once('value')
    .then((snapshot) => {
      if (snapshot.exists()) {
        const boxName = snapshot.val();

        console.log("Box Name for ID " + boxVal + ": " + boxName);
        document.getElementById('sbox_id').textContent = boxName;

      } else {
        console.log("No box found with ID " + boxVal);
      }
    })
    .catch((error) => {
      console.error("Error fetching box name for ID " + boxVal + ": ", error);
    });

  // document.getElementById('sbox_id').textContent = boxVal;
  db.ref(`sb/${boxVal}/`).once('value')
    .then(snapshot => {
      const data = snapshot.val();
      if (data) {
        populateSBLabels(data);
      }
    })
    .catch(error => {
      console.error('Error fetching data from Firebase:', error);
    });
}



function test2() {
  populateSBData();
}


let currentRLTBoxIndex = 0;
let RLTboxKeys = [];

function populateRLTData(debug) {
  const path = 'rlt/';
  console.log("")
  var boxVal = '';
  db.ref(path).once('value')
    .then(snapshot => {
      const boxes = snapshot.val();
      if (boxes) {
        RLTboxKeys = Object.keys(boxes); // Populate boxKeys here


        const activeBoxIndex = RLTboxKeys.findIndex(boxKey => boxes[boxKey].bxsts === 'AC');

        if (activeBoxIndex !== -1) {
          currentRLTBoxIndex = activeBoxIndex;
        } else {
          console.warn('No active box found with bxsts = "AC".');
        }

        boxVal = RLTboxKeys[currentRLTBoxIndex]; // Use the determined or default index
        console.log("Active boxVal:", boxVal);
        db.ref('bn/' + boxVal).once('value')
          .then((snapshot) => {
            if (snapshot.exists()) {
              const boxName = snapshot.val();

              console.log("Box Name for ID " + boxVal + ": " + boxName);
              document.getElementById('rltBox_id').textContent = boxName;

            } else {
              console.log("No box found with ID " + boxVal);
            }
          })
          .catch((error) => {
            console.error("Error fetching box name for ID " + boxVal + ": ", error);
          });

        return db.ref(`rlt/${boxVal}/`).once('value');
      } else {
        const container = document.getElementById('RLT-box-container');
        container.innerHTML = `
       Add Box in to the container.
      `;
      }
    })
    .then(snapshot => {
      const data = snapshot.val();
      if (data) {
        populateRLTLabels(data, boxVal, "call from populateBBData");
      }
    })
    .catch(error => {
      console.error('Error fetching data from Firebase:', error);
    });
}

function populateRLTLabels(data, boxVal, debug) {
  console.log("inside populate BB labels - ", debug, " -- ", boxVal);
  const rows = 'ABCDEFGHIJ';
  const cols = 10;

  const bioBankIds = Object.keys(data).map(key => data[key].bioBankId);
  const sts = Object.keys(data).map(key => data[key].status);
  const sample = Object.keys(data).map(key => data[key].sampleType);

  console.log("sts", sts);
  console.log("sample", sample);

  if (bioBankIds.length < 100) {
    console.warn('Not enough bioBankIds available for the matrix.');
  }

  for (let row = 0; row < rows.length; row++) {
    for (let col = 1; col <= cols; col++) {
      const labelName = `label_R${rows[row]}${col}`;
      const labelElement = document.getElementById(labelName);
      const index = row * cols + (col - 1);

      if (labelElement) {
        if (bioBankIds[index] !== '') {
          labelElement.innerHTML = `${bioBankIds[index] || ''}<br>${sample[index] || ''}`;
          labelElement.style.fontWeight = "bold";
        }
        else if (bioBankIds[index] === '') {
          labelElement.innerHTML = `${'-'}<br>${'-'}`;
          // labelElement.style.color = "rgb(143, 218, 187)";
        }


        const newLabelElement = labelElement.cloneNode(true);
        labelElement.parentNode.replaceChild(newLabelElement, labelElement);

        if (sts[index] === "o") {
          newLabelElement.style.background = "rgb(129, 129, 192)";
          const matchedData = [];
          newLabelElement.addEventListener('click', async function () {
            console.log('Fetching data for:', labelName);

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

            Object.keys(dbData).forEach(seqNum => {
              const seqData = dbData[seqNum];
              console.log("seqData", seqData);

              // Get the latest timestamp
              const latestTimestamp = Math.max(...Object.keys(seqData));

              const timestampData = seqData[latestTimestamp];
              console.log("Latest timestampData", timestampData);

              // Process based on sampleType
              if ((sampleType === "RLT" || sampleType === "RLT") && timestampData.ie.rlt) {
                const rlt = timestampData.ie.rlt;
                const boxName = rlt.split('/')[0];
                const rltIndex1 = rlt.split('/')[1];
                console.log("rltIndex1", rltIndex1);

                if (rltIndex1 && rltIndex1.includes(getSeatLabel(index))) {
                  matchedData.push({
                    mode: "SearchView",
                    bioBankId,
                    seq: seqNum,
                    timestamp: latestTimestamp
                  });
                  console.log("Matched:", {
                    mode: "SearchView",
                    bioBankId,
                    seqNum,
                    timestamp: latestTimestamp
                  });
                }
              }
            });


            if (matchedData.length > 0) {
              console.log('Matched Data:', matchedData);
              matchedData.forEach(item => {
                console.log(`Mode: ${item.mode}`);
                console.log(`BioBank ID: ${item.bioBankId}`);
                console.log(`Sequence: ${item.seq}`);
                console.log(`Timestamp: ${item.timestamp}`);
                // Call your display function here
                pages_display(item.mode, item.bioBankId, item.seq, item.timestamp);
              });
            } else {
              console.log('No match found for:', matchedData.length);

              console.log('No match found for:', labelName);
            }
          });

        }

        if (sts[index] === "s") {
          newLabelElement.style.background = "rgb(180, 180, 180)";
          const matchedData = [];

          newLabelElement.addEventListener('click', async function () {
            console.log('Fetching data for:', labelName);

            const bioBankId = bioBankIds[index];
            const sampleType = sample[index];

            localStorage.setItem('sharedbioid', bioBankId);

            const dbRef = db.ref(`sef/${bioBankId}`);
            const snapshot = await dbRef.get();

            if (!snapshot.exists()) {
              console.log("No data found for bioBankId:", bioBankId);
              return;
            }

            const dbData = snapshot.val();
            console.log("dbData", dbData);

            Object.keys(dbData).forEach(seqNum => {
              const seqData = dbData[seqNum];
              console.log("seqData", seqData);

              Object.keys(seqData).forEach(timestamp => {
                const timestampData = seqData[timestamp];
                console.log("timestampData", timestampData);

                if ((sampleType === "RLT" || sampleType === "RLT") && timestampData.ie.rlt) {
                  const rlt = timestampData.ie.rlt;
                  const boxName = rlt.split('/')[0];
                  const rltIndex1 = rlt.split('/')[1];

                  if (rltIndex1 && rltIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp
                    });
                    console.log("Matched:", {
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seqNum,
                      timestamp
                    });
                  }
                }

              });
            });

            if (matchedData.length > 0) {
              console.log('Matched Data:', matchedData);
              matchedData.forEach(item => {
                console.log(`Mode: ${item.mode}`);
                console.log(`Box Name: ${item.boxName}`);
                console.log(`BioBank ID: ${item.bioBankId}`);
                console.log(`Sequence: ${item.seq}`);
                console.log(`Timestamp: ${item.timestamp}`);
                shared_pages_display(item.mode, item.bioBankId, item.seq, item.boxName, item.timestamp);
              });
            } else {
              console.log('No match found for:', labelName);
            }
          });

        }

        if (sts[index] === "ps") {
          newLabelElement.style.background = "rgb(193, 154, 107)";
          const matchedData = [];
          newLabelElement.addEventListener('click', async function () {
            console.log('Fetching data for:', labelName);

            const bioBankId = bioBankIds[index];
            const sampleType = sample[index];

            localStorage.setItem('sharedbioid', bioBankId);

            const dbRef = db.ref(`sef/${bioBankId}`);
            const snapshot = await dbRef.get();

            if (!snapshot.exists()) {
              console.log("No data found for bioBankId:", bioBankId);
              return;
            }

            const dbData = snapshot.val();
            console.log("dbData", dbData);

            Object.keys(dbData).forEach(seqNum => {
              const seqData = dbData[seqNum];
              console.log("seqData", seqData);

              Object.keys(seqData).forEach(timestamp => {
                const timestampData = seqData[timestamp];
                console.log("timestampData", timestampData);

                if ((sampleType === "RLT" || sampleType === "RLT") && timestampData.ie.rlt) {
                  const rlt = timestampData.ie.rlt;
                  const boxName = rlt.split('/')[0];
                  const rltIndex1 = rlt.split('/')[1];

                  if (rltIndex1 && rltIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp
                    });
                    console.log("Matched:", {
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seqNum,
                      timestamp
                    });
                  }
                }

              });
            });

            if (matchedData.length > 0) {
              console.log('Matched Data:', matchedData);
              matchedData.forEach(item => {
                console.log(`Mode: ${item.mode}`);
                console.log(`Box Name: ${item.boxName}`);
                console.log(`BioBank ID: ${item.bioBankId}`);
                console.log(`Sequence: ${item.seq}`);
                console.log(`Timestamp: ${item.timestamp}`);
                shared_pages_display(item.mode, item.bioBankId, item.seq, item.boxName, item.timestamp);
              });
            } else {
              console.log('No match found for:', labelName);
            }
          });

        }

        if (sts[index] === "e") {
          newLabelElement.style.background = "rgb(143, 218, 187)";

          newLabelElement.addEventListener('click', function () {
            console.log("sts[index]", sts[index]);
            console.log('label name of clicked seat:', labelName);
            localStorage.removeItem("MRN");
            $('#exampleModalCenter').modal('show');
          });
        }

      }
    }
  }
}

function prev3Box() {
  if (currentRLTBoxIndex > 0) {
    loadRLTBox();  // Call loadBox to show the loading spinner
    currentRLTBoxIndex--;
    populateRLTDataForCurrentBox();
  }
}

function next3Box() {
  if (currentRLTBoxIndex < RLTboxKeys.length - 1) {
    loadRLTBox();  // Call loadBox to show the loading spinner
    currentRLTBoxIndex++;
    populateRLTDataForCurrentBox();
  }
}

function loadRLTBox() {
  event.preventDefault();
  console.log("hello")
  const container = document.getElementById('RLT-box-container');
  var loadprogress = document.getElementById('Rloadprogress');
  loadprogress.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Loading...
      `;
  loadprogress.style.display = "block"

  container.style.display = "none"

  console.log("Hello Bhanu");
  setTimeout(() => {
    loadprogress.innerHTML = '';
    loadprogress.style.display = "none"

    container.style.display = "block"
    populateRLTDataForCurrentBox();
  }, 1000);
}


function populateRLTDataForCurrentBox() {
  const boxVal = RLTboxKeys[currentRLTBoxIndex]; // Use the current index
  console.log("boxVal", boxVal);

  // document.getElementById('box_id').textContent = boxVal;
  db.ref('bn/' + boxVal).once('value')
    .then((snapshot) => {
      if (snapshot.exists()) {
        const boxName = snapshot.val();

        console.log("Box Name for ID " + boxVal + ": " + boxName);
        document.getElementById('rltBox_id').textContent = boxName;

      } else {
        console.log("No box found with ID " + boxVal);
      }
    })
    .catch((error) => {
      console.error("Error fetching box name for ID " + boxVal + ": ", error);
    });
  db.ref(`rlt/${boxVal}/`).once('value')
    .then(snapshot => {
      const data = snapshot.val();
      if (data) {
        populateRLTLabels(data, boxVal, "call from populateBBDataForCurrentBox");
      }
    })
    .catch(error => {
      console.error('Error fetching data from Firebase:', error);
    });
}

function test3() {
  populateRLTData();
}

let currentPCBoxIndex = 0;
let PCboxKeys = [];

function populatePCBData(debug) {
  const path = 'pcb/';
  console.log("")
  var boxVal = '';
  db.ref(path).once('value')
    .then(snapshot => {
      const boxes = snapshot.val();
      if (boxes) {
        PCboxKeys = Object.keys(boxes); // Populate boxKeys here


        const activeBoxIndex = PCboxKeys.findIndex(boxKey => boxes[boxKey].bxsts === 'AC');

        if (activeBoxIndex !== -1) {
          currentPCBoxIndex = activeBoxIndex;
        } else {
          console.warn('No active box found with bxsts = "AC".');
        }

        boxVal = PCboxKeys[currentPCBoxIndex]; // Use the determined or default index
        console.log("Active boxVal:", boxVal);
        db.ref('bn/' + boxVal).once('value')
          .then((snapshot) => {
            if (snapshot.exists()) {
              const boxName = snapshot.val();

              console.log("Box Name for ID " + boxVal + ": " + boxName);
              document.getElementById('pcBox_id').textContent = boxName;

            } else {
              console.log("No box found with ID " + boxVal);
            }
          })
          .catch((error) => {
            console.error("Error fetching box name for ID " + boxVal + ": ", error);
          });

        return db.ref(`pcb/${boxVal}/`).once('value');
      } else {
        const container = document.getElementById('Primary-box-container');
        container.innerHTML = `
       Add Box in to the container.
      `;
      }
    })
    .then(snapshot => {
      const data = snapshot.val();
      if (data) {
        populatePCBLabels(data, boxVal, "call from populateBBData");
      }
    })
    .catch(error => {
      console.error('Error fetching data from Firebase:', error);
    });
}

function populatePCBLabels(data, boxVal, debug) {
  console.log("inside populate BB labels - ", debug, " -- ", boxVal);
  const rows = 'ABCDEFGHIJ';
  const cols = 10;

  const bioBankIds = Object.keys(data).map(key => data[key].bioBankId);
  const sts = Object.keys(data).map(key => data[key].status);
  const sample = Object.keys(data).map(key => data[key].sampleType);

  console.log("sts", sts);
  console.log("sample", sample);

  if (bioBankIds.length < 100) {
    console.warn('Not enough bioBankIds available for the matrix.');
  }

  for (let row = 0; row < rows.length; row++) {
    for (let col = 1; col <= cols; col++) {
      const labelName = `label_P${rows[row]}${col}`;
      const labelElement = document.getElementById(labelName);
      const index = row * cols + (col - 1);

      if (labelElement) {
        if (bioBankIds[index] !== '') {
          labelElement.innerHTML = `${bioBankIds[index] || ''}<br>${sample[index] || ''}`;
          labelElement.style.fontWeight = "bold";
        }
        else if (bioBankIds[index] === '') {
          labelElement.innerHTML = `${'-'}<br>${'-'}`;
          // labelElement.style.color = "rgb(143, 218, 187)";
        }


        const newLabelElement = labelElement.cloneNode(true);
        labelElement.parentNode.replaceChild(newLabelElement, labelElement);

        if (sts[index] === "o") {
          newLabelElement.style.background = "rgb(129, 129, 192)";
          const matchedData = [];
          newLabelElement.addEventListener('click', async function () {
            console.log('Fetching data for:', labelName);

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

            Object.keys(dbData).forEach(seqNum => {
              const seqData = dbData[seqNum];
              console.log("seqData", seqData);

              // Get the latest timestamp
              const latestTimestamp = Math.max(...Object.keys(seqData));

              const timestampData = seqData[latestTimestamp];
              console.log("Latest timestampData", timestampData);

              // Process based on sampleType
              if ((sampleType === "PC" || sampleType === "PC") && timestampData.ie.pc) {
                const pc = timestampData.ie.pc;
                const boxName = pc.split('/')[0];
                const pcIndex1 = pc.split('/')[1];
                console.log("pcIndex1", pcIndex1);

                if (pcIndex1 && pcIndex1.includes(getSeatLabel(index))) {
                  matchedData.push({
                    mode: "SearchView",
                    bioBankId,
                    seq: seqNum,
                    timestamp: latestTimestamp
                  });
                  console.log("Matched:", {
                    mode: "SearchView",
                    bioBankId,
                    seqNum,
                    timestamp: latestTimestamp
                  });
                }
              }
            });


            if (matchedData.length > 0) {
              console.log('Matched Data:', matchedData);
              matchedData.forEach(item => {
                console.log(`Mode: ${item.mode}`);
                console.log(`BioBank ID: ${item.bioBankId}`);
                console.log(`Sequence: ${item.seq}`);
                console.log(`Timestamp: ${item.timestamp}`);
                // Call your display function here
                pages_display(item.mode, item.bioBankId, item.seq, item.timestamp);
              });
            } else {
              console.log('No match found for:', matchedData.length);

              console.log('No match found for:', labelName);
            }
          });

        }

        if (sts[index] === "s") {
          newLabelElement.style.background = "rgb(180, 180, 180)";
          const matchedData = [];
          newLabelElement.addEventListener('click', async function () {
            console.log('Fetching data for:', labelName);

            const bioBankId = bioBankIds[index];
            const sampleType = sample[index];

            localStorage.setItem('sharedbioid', bioBankId);

            const dbRef = db.ref(`sef/${bioBankId}`);
            const snapshot = await dbRef.get();

            if (!snapshot.exists()) {
              console.log("No data found for bioBankId:", bioBankId);
              return;
            }

            const dbData = snapshot.val();
            console.log("dbData", dbData);

            Object.keys(dbData).forEach(seqNum => {
              const seqData = dbData[seqNum];
              console.log("seqData", seqData);

              Object.keys(seqData).forEach(timestamp => {
                const timestampData = seqData[timestamp];
                console.log("timestampData", timestampData);

                if ((sampleType === "PC" || sampleType === "PC") && timestampData.ie.pc) {
                  const pc = timestampData.ie.pc;
                  const boxName = pc.split('/')[0];
                  const pcIndex1 = pc.split('/')[1];

                  if (pcIndex1 && pcIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp
                    });
                    console.log("Matched:", {
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seqNum,
                      timestamp
                    });
                  }
                }

              });
            });

            if (matchedData.length > 0) {
              console.log('Matched Data:', matchedData);
              matchedData.forEach(item => {
                console.log(`Mode: ${item.mode}`);
                console.log(`Box Name: ${item.boxName}`);
                console.log(`BioBank ID: ${item.bioBankId}`);
                console.log(`Sequence: ${item.seq}`);
                console.log(`Timestamp: ${item.timestamp}`);
                shared_pages_display(item.mode, item.bioBankId, item.seq, item.boxName, item.timestamp);
              });
            } else {
              console.log('No match found for:', labelName);
            }
          });

        }

        if (sts[index] === "ps") {
          newLabelElement.style.background = "rgb(193, 154, 107)";
          const matchedData = [];
          newLabelElement.addEventListener('click', async function () {
            console.log('Fetching data for:', labelName);

            const bioBankId = bioBankIds[index];
            const sampleType = sample[index];

            localStorage.setItem('sharedbioid', bioBankId);

            const dbRef = db.ref(`sef/${bioBankId}`);
            const snapshot = await dbRef.get();

            if (!snapshot.exists()) {
              console.log("No data found for bioBankId:", bioBankId);
              return;
            }

            const dbData = snapshot.val();
            console.log("dbData", dbData);

            Object.keys(dbData).forEach(seqNum => {
              const seqData = dbData[seqNum];
              console.log("seqData", seqData);

              Object.keys(seqData).forEach(timestamp => {
                const timestampData = seqData[timestamp];
                console.log("timestampData", timestampData);

                if ((sampleType === "PC" || sampleType === "PC") && timestampData.ie.pc) {
                  const pc = timestampData.ie.pc;
                  const boxName = pc.split('/')[0];
                  const pcIndex1 = pc.split('/')[1];

                  if (pcIndex1 && pcIndex1.includes(getSeatLabel(index))) {
                    matchedData.push({
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seq: seqNum,
                      timestamp
                    });
                    console.log("Matched:", {
                      mode: "sharedView",
                      boxName,
                      bioBankId,
                      seqNum,
                      timestamp
                    });
                  }
                }

              });
            });

            if (matchedData.length > 0) {
              console.log('Matched Data:', matchedData);
              matchedData.forEach(item => {
                console.log(`Mode: ${item.mode}`);
                console.log(`Box Name: ${item.boxName}`);
                console.log(`BioBank ID: ${item.bioBankId}`);
                console.log(`Sequence: ${item.seq}`);
                console.log(`Timestamp: ${item.timestamp}`);
                shared_pages_display(item.mode, item.bioBankId, item.seq, item.boxName, item.timestamp);
              });
            } else {
              console.log('No match found for:', labelName);
            }
          });
        }

        if (sts[index] === "e") {
          newLabelElement.style.background = "rgb(143, 218, 187)";

          newLabelElement.addEventListener('click', function () {
            console.log("sts[index]", sts[index]);
            console.log('label name of clicked seat:', labelName);
            localStorage.removeItem("MRN");
            $('#exampleModalCenter').modal('show');
          });
        }

      }
    }
  }
}

function prev4Box() {
  if (currentPCBoxIndex > 0) {
    loadPCBox();  // Call loadBox to show the loading spinner
    currentPCBoxIndex--;
    populatePCDataForCurrentBox();
  }
}

function next4Box() {
  if (currentPCBoxIndex < PCboxKeys.length - 1) {
    loadPCBox();  // Call loadBox to show the loading spinner
    currentPCBoxIndex++;
    populatePCDataForCurrentBox();
  }
}

function loadPCBox() {
  event.preventDefault();
  console.log("hello")
  const container = document.getElementById('Primary-box-container');
  var loadprogress = document.getElementById('Ploadprogress');
  loadprogress.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Loading...
      `;
  loadprogress.style.display = "block"

  container.style.display = "none"

  console.log("Hello Bhanu");
  setTimeout(() => {
    loadprogress.innerHTML = '';
    loadprogress.style.display = "none"

    container.style.display = "block"
    populatePCDataForCurrentBox();
  }, 1000);
}

function populatePCDataForCurrentBox() {
  const boxVal = PCboxKeys[currentPCBoxIndex]; // Use the current index
  console.log("boxVal", boxVal);

  // document.getElementById('box_id').textContent = boxVal;
  db.ref('bn/' + boxVal).once('value')
    .then((snapshot) => {
      if (snapshot.exists()) {
        const boxName = snapshot.val();

        console.log("Box Name for ID " + boxVal + ": " + boxName);
        document.getElementById('pcBox_id').textContent = boxName;

      } else {
        console.log("No box found with ID " + boxVal);
      }
    })
    .catch((error) => {
      console.error("Error fetching box name for ID " + boxVal + ": ", error);
    });
  db.ref(`pcb/${boxVal}/`).once('value')
    .then(snapshot => {
      const data = snapshot.val();
      if (data) {
        populatePCBLabels(data, boxVal, "call from populateBBDataForCurrentBox");
      }
    })
    .catch(error => {
      console.error('Error fetching data from Firebase:', error);
    });
}


function test4() {
  populatePCBData();
}



function openModal(seatInfo) {
  $('#exampleModalCenter').modal('show');
}








// function AppendBloodBox(boxName) {
//   const newBoxData = {};

//   // Prepare the new box data
//   for (let i = 0; i < 101; i++) {
//     if (i < 100) {
//       newBoxData[i] = {
//         bioBankId: "",
//         sampleType: "",
//         status: "e"
//       };
//     } else {
//       newBoxData['bxsts'] = "AC";  // New box status is Active (AC)
//     }
//   }
//   db.ref('bb/').once('value')
//     .then(snapshot => {
//       const existingBoxes = snapshot.val();
//       if (existingBoxes) {
//         for (const existingBox in existingBoxes) {
//           if (existingBox !== boxName) {
//             // Update old boxes' status to 'IAC' (Inactive)
//             const oldBoxData = existingBoxes[existingBox];
//             const updatedOldBoxData = {};

//             for (let i = 0; i < 100; i++) {
//               updatedOldBoxData[i] = oldBoxData[i] || {
//                 bioBankId: "",
//                 sampleType: "",
//                 status: "IAC"  // Mark old boxes as Inactive (IAC)
//               };
//             }

//             updatedOldBoxData['bxsts'] = "IAC";  // Mark the old box itself as Inactive (IAC)
//             db.ref('bb/' + existingBox + '/').set(updatedOldBoxData)
//               .catch((error) => {
//                 console.error("Error updating old box status: ", error);
//               });
//           }
//         }
//       }

//       // Now, add the new box with the active status
//       db.ref('bb/' + boxName + '/').set(newBoxData)
//         .then(() => {
//           console.log("New box added successfully to Firebase.");
//           window.location.reload();
//         })
//         .catch((error) => {
//           console.error("Error saving new box to Firebase: ", error);
//         });
//     })
//     .catch((error) => {
//       console.error("Error fetching existing boxes: ", error);
//     });
// }


function AppendRLTBox(boxName, newBoxId) {
  const newBoxData = {};

  // Prepare the new box data
  for (let i = 0; i < 101; i++) {
    if (i < 100) {
      newBoxData[i] = {
        bioBankId: "",
        sampleType: "",
        status: "e"
      };
    } else {
      newBoxData['bxsts'] = "AC";  // New box status is Active (AC)
    }
  }

  db.ref('rlt/').once('value')
    .then(snapshot => {
      const existingBoxes = snapshot.val();
      if (existingBoxes) {
        for (const existingBox in existingBoxes) {
          if (existingBox !== newBoxId) {
            // Update old boxes' status to 'IAC' (Inactive)
            const oldBoxData = existingBoxes[existingBox];
            const updatedOldBoxData = {};

            for (let i = 0; i < 100; i++) {
              updatedOldBoxData[i] = oldBoxData[i] || {
                bioBankId: "",
                sampleType: "",
                status: "IAC"  // Mark old boxes as Inactive (IAC)
              };
            }

            updatedOldBoxData['bxsts'] = "IAC";  // Mark the old box itself as Inactive (IAC)
            db.ref('rlt/' + existingBox + '/').set(updatedOldBoxData)
              .catch((error) => {
                console.error("Error updating old box status: ", error);
              });
          }
        }
      }

      // Now, add the new box with the active status under the generated ID
      db.ref('rlt/' + newBoxId + '/').set(newBoxData)
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

  // Store the box name under the 'bn' node with the new box ID
  db.ref('bn/' + newBoxId).set(boxName)
    .then(() => {
      console.log("Box name added successfully to the 'bn' node.");
      fetchBnData();
    }).catch((error) => {
      console.error("Error saving box name to 'bn' node: ", error);
    });
}

function AppendPCBox(boxName, newBoxId) {
  const newBoxData = {};

  // Prepare the new box data
  for (let i = 0; i < 101; i++) {
    if (i < 100) {
      newBoxData[i] = {
        bioBankId: "",
        sampleType: "",
        status: "e"
      };
    } else {
      newBoxData['bxsts'] = "AC";  // New box status is Active (AC)
    }
  }

  db.ref('pcb/').once('value')
    .then(snapshot => {
      const existingBoxes = snapshot.val();
      if (existingBoxes) {
        for (const existingBox in existingBoxes) {
          if (existingBox !== newBoxId) {
            // Update old boxes' status to 'IAC' (Inactive)
            const oldBoxData = existingBoxes[existingBox];
            const updatedOldBoxData = {};

            for (let i = 0; i < 100; i++) {
              updatedOldBoxData[i] = oldBoxData[i] || {
                bioBankId: "",
                sampleType: "",
                status: "IAC"  // Mark old boxes as Inactive (IAC)
              };
            }

            updatedOldBoxData['bxsts'] = "IAC";  // Mark the old box itself as Inactive (IAC)
            db.ref('pcb/' + existingBox + '/').set(updatedOldBoxData)
              .catch((error) => {
                console.error("Error updating old box status: ", error);
              });
          }
        }
      }

      // Now, add the new box with the active status under the generated ID
      db.ref('pcb/' + newBoxId + '/').set(newBoxData)
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

  // Store the box name under the 'bn' node with the new box ID
  db.ref('bn/' + newBoxId).set(boxName)
    .then(() => {
      console.log("Box name added successfully to the 'bn' node.");
      fetchBnData();
    }).catch((error) => {
      console.error("Error saving box name to 'bn' node: ", error);
    });
}


function AppendBloodBox(boxName, newBoxId) {
  const newBoxData = {};

  // Prepare the new box data
  for (let i = 0; i < 101; i++) {
    if (i < 100) {
      newBoxData[i] = {
        bioBankId: "",
        sampleType: "",
        status: "e"
      };
    } else {
      newBoxData['bxsts'] = "AC";  // New box status is Active (AC)
    }
  }

  db.ref('bb/').once('value')
    .then(snapshot => {
      const existingBoxes = snapshot.val();
      if (existingBoxes) {
        for (const existingBox in existingBoxes) {
          if (existingBox !== newBoxId) {
            // Update old boxes' status to 'IAC' (Inactive)
            const oldBoxData = existingBoxes[existingBox];
            const updatedOldBoxData = {};

            for (let i = 0; i < 100; i++) {
              updatedOldBoxData[i] = oldBoxData[i] || {
                bioBankId: "",
                sampleType: "",
                status: "IAC"  // Mark old boxes as Inactive (IAC)
              };
            }

            updatedOldBoxData['bxsts'] = "IAC";  // Mark the old box itself as Inactive (IAC)
            db.ref('bb/' + existingBox + '/').set(updatedOldBoxData)
              .catch((error) => {
                console.error("Error updating old box status: ", error);
              });
          }
        }
      }

      // Now, add the new box with the active status under the generated ID
      db.ref('bb/' + newBoxId + '/').set(newBoxData)
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

  // Store the box name under the 'bn' node with the new box ID
  db.ref('bn/' + newBoxId).set(boxName)
    .then(() => {
      console.log("Box name added successfully to the 'bn' node.");
      fetchBnData();
    }).catch((error) => {
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
        status: "e"
      };
    }
    else {
      newBoxData['bxsts'] = "AC";
    }
  }
  db.ref('sb/').once('value')
    .then(snapshot => {
      const existingBoxes = snapshot.val();
      if (existingBoxes) {
        for (const existingBox in existingBoxes) {
          if (existingBox !== newBoxId) {
            // Update old boxes' status to 'IAC' (Inactive)
            const oldBoxData = existingBoxes[existingBox];
            const updatedOldBoxData = {};

            for (let i = 0; i < 100; i++) {
              updatedOldBoxData[i] = oldBoxData[i] || {
                bioBankId: "",
                sampleType: "",
                status: "IAC"  // Mark old boxes as Inactive (IAC)
              };
            }

            updatedOldBoxData['bxsts'] = "IAC";  // Mark the old box itself as Inactive (IAC)
            db.ref('sb/' + existingBox + '/').set(updatedOldBoxData)
              .catch((error) => {
                console.error("Error updating old box status: ", error);
              });
          }
        }
      }

      // Now, add the new box with the active status
      db.ref('sb/' + newBoxId + '/').set(newBoxData)
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

  db.ref('bn/' + newBoxId).set(boxName)
    .then(() => {
      console.log("Box name added successfully to the 'bn' node.");
      fetchBnData();
    }).catch((error) => {
      console.error("Error saving box name to 'bn' node: ", error);
    });

}

function data() {
  db.ref('bb').once('value', (snapshot) => {
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

console.log(" -- mrn -- " + localStorage.getItem("MRN") || '');
console.log(" -- bio id -- " + localStorage.getItem("BioVal") || '');

let user = sessionStorage.getItem('userName');
console.log("User Name", user)



// function validateForm1() {
//   const requiredFields = [
//     { field: document.getElementById('mrnNo'), name: 'MRN Number' },
//     { field: document.getElementById('bioBankId'), name: 'Bio Bank ID' },
//     { field: document.getElementById('patAge'), name: 'Age' },
//     { field: document.querySelector('input[name="customRadio"]:checked'), name: 'Gender' },
//     { field: document.querySelector('input[name="radioCancerType"]:checked'), name: 'Cancer Type' },
//     { field: document.querySelector('input[name="customProcedure"]:checked'), name: 'Procedure Types' },
//     { field: document.querySelector('input[name="MetastasisSample"]:checked'), name: 'Metastasis Sample' },
//     { field: document.querySelector('input[name="bloodSample"]:checked'), name: 'Blood Sample' },
//     { field: document.querySelector('input[name="specimenSample"]:checked'), name: 'Specimen Sample' },
//     { field: document.querySelector('input[name="otherSample"]:checked'), name: 'Other Sample' },
//     { field: document.querySelector('input[name="customConsent"]:checked'), name: 'Consent' },
//     { field: document.querySelector('input[name="IschemicRadio"]:checked'), name: 'Ischemic Sample' },
//     { field: document.querySelector('input[name="processedRadio"]:checked'), name: 'All samples Received Together' }
//   ];

//   let allFilled = true;
//   const emptyFields = [];

//   requiredFields.forEach(item => {
//     if (!item.field || (item.field.type === 'radio' && !item.field.checked) || (item.field.type === 'number' && item.field.value === '')) {
//       allFilled = false;
//       emptyFields.push(item.name);
//     }
//   });

//   if (!allFilled) {
//     console.log('Please fill in the following required fields:', emptyFields.join(', '));
//     alert('Please enter all the required fields. Check the console for details.');
//     return;  // Stop the function if fields are missing
//   }

//   // Collect form data
//   const bioBankId = document.getElementById('bioBankId').value;
//   const timestamp = Math.floor(Date.now() / 1000); // Current timestamp

//   const data = {
//     ie: {
//       ag: document.getElementById('patAge').value,
//       sx: document.querySelector('input[name="customRadio"]:checked').value,
//       ct: document.querySelector('input[name="radioCancerType"]:checked').value,
//       tpr: document.querySelector('input[name="customProcedure"]:checked').value,
//       dpr: document.getElementById('procedureDetail').value,
//       srn: document.getElementById('surgeonName').value,
//       ss: document.querySelector('input[name="specimenSample"]:checked').value,
//       nft: document.getElementById('ft_tubes').value,
//       nfn: document.getElementById('fn_tubes').value,
//       bs: document.querySelector('input[name="bloodSample"]:checked').value,
//       bpg: document.getElementById('PlasmagridNo').value,
//       bsg: document.getElementById('SerumgridNo').value,
//       bbcg: document.getElementById('bufferCoatgridNo').value,
//       osmp: document.querySelector('input[name="otherSample"]:checked').value,
//       osg: document.getElementById('OSgridNo').value,
//       osdsc: document.getElementById('otSampleDesc').value,
//       mts: document.querySelector('input[name="MetastasisSample"]:checked').value,
//       cnst: document.querySelector('input[name="customConsent"]:checked').value,
//       iss: document.querySelector('input[name="IschemicRadio"]:checked').value,
//       prb: document.getElementById('processedBy').value,
//       scpt: document.querySelector('input[name="processedRadio"]:checked').value,
//       srt: document.getElementById('sampleReceivedTime').value,
//       spt: document.getElementById('sampleProcessedTime').value,
//       brt: document.getElementById('bloodSampleReceivedTime').value,
//       bpt: document.getElementById('bloodSampleProcessedTime').value,
//       sprt: document.getElementById('SpecimenSampleReceivedTime').value,
//       sppt: document.getElementById('SpecimenSampleProcessedTime').value,
//       osrt: document.getElementById('OtherSampleReceivedTime').value,
//       ospt: document.getElementById('OtherSampleProcessedTime').value,
//       sef_ub: 'currentUser'
//     },
//     md: {
//       fhc: "",
//       fhcr: "",
//       fhct: "",
//       fh: "",
//       hac: "",
//       hs: "",
//       ec: "",
//       ecm: "",
//       ffqc: "",
//       ftr: "",
//       ts: "",
//       tp: "",
//       ad: "",
//       cs: "",
//       ihcm: "",
//       ihcd: "",
//       gt: "",
//       gtd: "",
//       pst: "",
//       gd: "",
//       fc: "",
//       lvi: "",
//       pni: "",
//       ptnm: "",
//       as: "",
//       nnt: "",
//       npn: "",
//       ts: "",
//       dm: "",
//       mpt: "",
//       btn: "",
//       bd: "",
//       nact: "",
//       nactdc: "",
//       nactdlc: "",
//       stn: "",
//       sd: "",
//       rcbs: "",
//       act: "",
//       actdc: "",
//       actdls: "",
//       rd: "",
//       rdd: "",
//       rtdls: "",
//       mdu: 'currentUser',
//       ipba: ""
//     },
//     brf: {
//       am: "",
//       pty: "",
//       noc: "",
//       afc: "",
//       bf: "",
//       dbf: "",
//       ms: "",
//       ad: "",
//       er: "",
//       pr: "",
//       h2: "",
//       sbt: "",
//       k67: "",
//       cs: "",
//       ht: "",
//       sps: ""
//     }
//   };

//   // Automatically increment the section (s[i+1])
//   db.ref(`sef/${bioBankId}`).once('value', snapshot => {
//     const sections = snapshot.val();
//     let nextSectionIndex = 1; // Start with 's1'

//     if (sections) {
//       // Check the highest existing section
//       const sectionKeys = Object.keys(sections);
//       sectionKeys.forEach(key => {
//         const sectionNumber = parseInt(key.replace('s', ''), 10);
//         if (sectionNumber >= nextSectionIndex) {
//           nextSectionIndex = sectionNumber + 1;
//         }
//       });
//     }

//     // Generate the next section name (s[i+1])
//     const nextSection = `s${nextSectionIndex}`;

//     // Save data to the next available section
//     db.ref(`sef/${bioBankId}/${nextSection}/${timestamp}`).set(data)
//       .then(() => {
//         alert('Form submitted successfully to ' + nextSection);
//       })
//       .catch((error) => {
//         console.error('Error writing to Firebase', error);
//       });
//   });
// }



// function validateForm() {
//   const data = {
//     ie: {
//       ag: document.getElementById('patAge').value,
//       sx: document.querySelector('input[name="customRadio"]:checked').value,
//       ct: document.querySelector('input[name="radioCancerType"]:checked').value,
//       tpr: document.querySelector('input[name="customProcedure"]:checked').value,
//       dpr: document.getElementById('procedureDetail').value,
//       srn: document.getElementById('surgeonName').value,
//       ss: document.querySelector('input[name="specimenSample"]:checked').value,
//       nft: document.getElementById('ft_tubes').value,
//       nfn: document.getElementById('fn_tubes').value,
//       bs: document.querySelector('input[name="bloodSample"]:checked').value,
//       bpg: document.getElementById('PlasmagridNo').value,
//       bsg: document.getElementById('SerumgridNo').value,
//       bbcg: document.getElementById('bufferCoatgridNo').value,
//       osmp: document.querySelector('input[name="otherSample"]:checked').value,
//       osg: document.getElementById('OSgridNo').value,
//       osdsc: document.getElementById('otSampleDesc').value,
//       mts: document.querySelector('input[name="MetastasisSample"]:checked').value,
//       cnst: document.querySelector('input[name="customConsent"]:checked').value,
//       iss: document.querySelector('input[name="IschemicRadio"]:checked').value,
//       prb: document.getElementById('processedBy').value,
//       scpt: document.querySelector('input[name="processedRadio"]:checked').value,
//       srt: document.getElementById('sampleReceivedTime').value,
//       spt: document.getElementById('sampleProcessedTime').value,
//       brt: document.getElementById('bloodSampleReceivedTime').value,
//       bpt: document.getElementById('bloodSampleProcessedTime').value,
//       sprt: document.getElementById('SpecimenSampleReceivedTime').value,
//       sppt: document.getElementById('SpecimenSampleProcessedTime').value,
//       osrt: document.getElementById('OtherSampleReceivedTime').value,
//       ospt: document.getElementById('OtherSampleProcessedTime').value,
//       sef_ub: 'currentUser'
//     },
//     md: {
//       fhc: document.querySelector('input[name="RadioFHabit"]:checked').value || "",
//       fhcr: document.getElementById('familyRelation').value || "",
//       fhct: document.getElementById('familyCancerType').value || "",
//       fh: document.querySelector('input[name="RadioFdHabit"]:checked').value || "",
//       hac: document.querySelector('input[name="RadioAlcoholHabit"]:checked').value || "",
//       hs: document.querySelector('input[name="RadioSmokeHabit"]:checked').value || "",
//       ec: document.querySelector('input[name="ECH"]:checked').value || "",
//       ecm: document.getElementById('comorbidityMedications').value || "",
//       ffqc: document.getElementById('ffQcComments').value || "",
//       ftr: document.getElementById('ffTissueRemarks').value || "",
//       ts: document.getElementById('tumorSite').value || "",
//       tp: document.getElementById('tumorPercentage').value || "",
//       ad: document.getElementById('ageAtDiagnosis').value || "",
//       cs: document.getElementById('clinicalStage').value || "",
//       ihcm: document.querySelector('input[name="ihcMarkerStatus"]:checked').value || "",
//       ihcd: document.getElementById('ihcMarkerDescription').value || "",
//       gt: document.querySelector('input[name="geneticTesting"]:checked').value || "",
//       gtd: document.getElementById('geneticTestingDescription').value || "",
//       pst: document.getElementById('bioBankId').value || "",
//       gd: document.getElementById('grade').value || "",
//       fc: document.querySelector('input[name="focality"]:checked').value || "",
//       lvi: document.querySelector('input[name="lvi"]:checked').value || "",
//       pni: document.querySelector('input[name="pni"]:checked').value || "",
//       ptnm: document.getElementById('ptnm').value || "",
//       as: document.getElementById('ajccStaging').value || "",
//       nnt: document.getElementById('nodesTested').value || "",
//       npn: document.getElementById('positiveNodes').value || "",
//       ts: document.getElementById('tumorSize').value || "",
//       dm: document.querySelector('input[name="denovoMetastasis"]:checked').value || "",
//       mpt: document.querySelector('input[name="metastasisPostTreatment"]:checked').value || "",
//       btn: document.getElementById('biopsyTissueNumber').value || "",
//       bd: document.getElementById('biopsyDate').value || "",
//       nact: document.querySelector('input[name="nact"]:checked').value || "",
//       nactdc: document.getElementById('nactDrugCycles').value || "",
//       nactdlc: document.getElementById('nactDateLastCycle').value || "",
//       stn: document.getElementById('surgeryTissueNumber').value || "",
//       sd: document.getElementById('surgeryDate').value || "",
//       rcbs: document.getElementById('rcbScores').value || "",
//       act: document.querySelector('input[name="act"]:checked').value || "",
//       actdc: document.getElementById('actDrugCycles').value || "",
//       actdls: document.getElementById('actDateLastCycle').value || "",
//       rd: document.querySelector('input[name="radiotherapy"]:checked').value || "",
//       rdd: document.getElementById('radiotherapyDetails').value || "",
//       rtdls: document.getElementById('radiotherapyLastCycleDate').value || "",
//       mdu: 'currentUser',
//       ipba: document.querySelector('input[name="isParaffinBlockAvailable"]:checked').value || ""
//     },
//     brf: {
//       am: document.getElementById('ageAtMenarche').value || "",
//       pty: document.getElementById('parity').value || "",
//       noc: document.getElementById('numChild').value || "",
//       afc:document.getElementById('ageAtFirstChild').value || "",
//       bf:document.querySelector('input[name="breFd"]:checked').value || "",
//       dbf: document.getElementById('dbf').value || "",
//       ms: document.querySelector('input[name="mStatus"]:checked').value || "",
//       ad: document.getElementById('ad').value || "",
//       er:  document.querySelector('input[name="ERRadio"]:checked').value || "",
//       pr:  document.querySelector('input[name="PRRadio"]:checked').value || "",
//       h2:  document.querySelector('input[name="HER2Radio"]:checked').value || "",
//       sbt: document.getElementById('sbt').value || "",
//       k67: document.getElementById('k67').value || "",
//       cs: document.getElementById('ClinicalS').value || "",
//       ht: document.getElementById('HistologicalS').value || "",
//       sps: document.getElementById('sps').value || ""
//     }
//   };
// }



function validateAndCollectData() {
  // const form1Data = validateForm1();
  // const form2Data = validateForm2();
  // const form3Data = validateForm3();

  Promise.all([
    Promise.resolve(validateForm1()),  // Wraps the synchronous result in a resolved promise
    Promise.resolve(validateForm2()),
    Promise.resolve(validateForm3())
  ])
    .then((results) => {
      const [form1Data, form2Data, form3Data] = results;
      console.log(" checking ...", form1Data, form2Data, form3Data);
      if (form1Data && form2Data && form3Data) {

        const data = {
          ie: form1Data.ie,
          md: form2Data.md,
          brf: form3Data.brf
        };

        const updateMode = new URLSearchParams(window.location.search).get('update');
        console.log("form1Data.ie.fng", form1Data.ie.fng)
        console.log("form1Data.ie.ftg", form1Data.ie.ftg)


        // db.ref(`sef`).once('value', snapshot => {
        //   const data = snapshot.val();
        //   const keysArray = [];
      
        //   if (data) {
        //     // Loop through the keys and push them into keysArray
        //     Object.keys(data).forEach(key => {
        //       keysArray.push(key);
        //     });
        //   }
        //   const bioBankId = document.getElementById('bioBankId').value;
      
        //   const dbRef = db.ref(`sef/${bioBankId}`);
        //   const snapshot = await dbRef.get();
      
        //   if (!snapshot.exists()) {
        //     console.log("No data found for bioBankId:", bioBankId);
        //     return;
        //   }
      
        //   const dbData = snapshot.val();
        //   console.log("dbData", dbData);
      
        //   Object.keys(dbData).forEach(seqNum => {
        //     const seqData = dbData[seqNum];
        //     console.log("seqData", seqData);
      
        //     // Get the latest timestamp
        //     const latestTimestamp = Math.max(...Object.keys(seqData));
      
        //     const timestampData = seqData[latestTimestamp];
        //     console.log("Latest timestampData", timestampData);
      
        //     if(bioBankId.exists(keysArray)){
        //       db.ref(`sef/${bioBankId}/ ${seqNum}/${timestampData}`).once('value',snapshots=>{
        //         const data = snapshots.val();
        //         console.log("data.ie.bs",data.ie.bs)
        //         if (data.ie.bs ==="false" && form1Data.ie.bs === "true"){
        //           if (form1Data.ie.bpg) {
        //             updateBB(form1Data.ie.bpg, "Plasma");
        //           }
        //           if (form1Data.ie.bsg) {
        //             updateBB(form1Data.ie.bsg, "Serum");
        //           }
        //           if (form1Data.ie.bbcg) {
        //             updateBB(form1Data.ie.bbcg, "Buffy Coat");
        //           }
        //         }
        //         if (data.ie.ss ==="false" && form1Data.ie.ss === "true"){
        //           if (form1Data.ie.ftg !== "" && form1Data.ie.ftg !== null) {
        //             updateSB(form1Data.ie.ftg, "FT-1");
        //           }
        //           if (form1Data.ie.fng !== "" && form1Data.ie.fng !== null) {
        //             updateSB(form1Data.ie.fng, "FN-1");
        //           }
        //         }
        //         if (data.ie.osmp ==="false" && form1Data.ie.osmp === "true"){
        //           if (form1Data.ie.osg) {
        //             updateBB(form1Data.ie.osg, "Other");
        //           }
        //         }
        //         if (data.ie.rltS ==="false" && form1Data.ie.rltS === "true"){
        //           if (form1Data.ie.rlt) {
        //             updateRLT(form1Data.ie.rlt, "RLT");
        //           }
        //         }
        //         if (data.ie.pcS ==="false" && form1Data.ie.pcS === "true"){
        //           if (form1Data.ie.pc) {
        //             updatePC(form1Data.ie.pc, "PC");
        //           }
        //         }
        //       })
        //     }
        //     else{
        //       if (form1Data.ie.bpg) {
        //         updateBB(form1Data.ie.bpg, "Plasma");
        //       }
        //       if (form1Data.ie.bsg) {
        //         updateBB(form1Data.ie.bsg, "Serum");
        //       }
        //       if (form1Data.ie.bbcg) {
        //         updateBB(form1Data.ie.bbcg, "Buffy Coat");
        //       }
        //       if (form1Data.ie.osg) {
        //         updateBB(form1Data.ie.osg, "Other");
        //       }
        //       if (form1Data.ie.rlt) {
        //         updateRLT(form1Data.ie.rlt, "RLT");
        //       }
        //       if (form1Data.ie.pc) {
        //         updatePC(form1Data.ie.pc, "PC");
        //       }
      
        //       // updateBB(form1Data.ie.bpg, "Plasma");
        //       // updateBB(form1Data.ie.bsg, "Serum");
        //       // updateBB(form1Data.ie.bbcg, "Buffy Coat");
        //       // updateBB(form1Data.ie.osg, "Other");
      
      
        //       if (form1Data.ie.ftg !== "" && form1Data.ie.ftg !== null) {
        //         updateSB(form1Data.ie.ftg, "FT-1");
        //       }
        //       if (form1Data.ie.fng !== "" && form1Data.ie.fng !== null) {
        //         updateSB(form1Data.ie.fng, "FN-1");
        //       }
        //     }
        //   })
          
      
        //   console.log("Keys Array:", keysArray);
        // });


        console.log("Plasma data", form1Data.ie.bpg)
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
          updateRLT(form1Data.ie.rlt, "RLT");
        }
        if (form1Data.ie.pc) {
          updatePC(form1Data.ie.pc, "PC");
        }

        // updateBB(form1Data.ie.bpg, "Plasma");
        // updateBB(form1Data.ie.bsg, "Serum");
        // updateBB(form1Data.ie.bbcg, "Buffy Coat");
        // updateBB(form1Data.ie.osg, "Other");


        if (form1Data.ie.ftg !== "" && form1Data.ie.ftg !== null) {
          updateSB(form1Data.ie.ftg, "FT-1");
        }
        if (form1Data.ie.fng !== "" && form1Data.ie.fng !== null) {
          updateSB(form1Data.ie.fng, "FN-1");
        }
        patients();

        if (updateMode === 'true') {
          updateToFirebase(data);
        } else {
          saveToFirebase(data);
        }// Now add the switch case for the mode

        return data;

      }
    })
    .catch((error) => {
      console.error("Error during form validation:", error);
    });




  // // Using Promise.all() to wait for all promises to resolve
  // Promise.all([validateForm1(), validateForm2(), validateForm3()])
  //   .then((results) => {
  //     //const [form1Data, form2Data, form3Data] = results;
  //     // Now you can use form1Data, form2Data, and form3Data
  //     console.log(" testing ---",results.form1Data , results.form2Data , results.form3Data);


  //   })
  //   .catch((error) => {
  //     console.error("Error during form validation:", error);
  //   });




  /*  if (form1Data && form2Data && form3Data) {
      const data = {
        ie: form1Data.ie,
        md: form2Data.md,
        brf: form3Data.brf
      };
  
      const updateMode = new URLSearchParams(window.location.search).get('update');
  
      console.log("Plasma data",form1Data.ie.bpg)
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
  
      // updateBB(form1Data.ie.bpg, "Plasma");
      // updateBB(form1Data.ie.bsg, "Serum");
      // updateBB(form1Data.ie.bbcg, "Buffy Coat");
      // updateBB(form1Data.ie.osg, "Other");
  
  
      if (form1Data.ie.ftg !== "") {
        updateSB(form1Data.ie.ftg, "FT-1");
      }
      if (form1Data.ie.fng !== "") {
        updateSB(form1Data.ie.fng, "FN-1");
      }
  
      patients();
  
      if (updateMode === 'true') {
        updateToFirebase(data);
      } else {
        saveToFirebase(data);
      }// Now add the switch case for the mode
  
      return data;
    } else {
      return null;
    }*/
}

// function validateAndCollectData() {
//     const form1Data = validateForm1();
//     const form2Data = validateForm2();
//     const form3Data = validateForm3();

//     // Check if all forms are valid (i.e., form data is returned and not false)
//     if (form1Data && form2Data && form3Data) {
//       const data = {
//         ie: form1Data.ie,
//         md: form2Data.md,
//         brf: form3Data.brf
//       };
//       // if (update==='true') {
//       //   updateToFirebase(data);
//       // }
//       // else{
//         saveToFirebase(data);
//       // }

//       patients();
//       return data;
//     } else {
//       return null;
//     }
//   }


// Validate Form 1



function validateForm1() {
  const requiredFields = [
    { field: document.getElementById('mrnNo'), name: 'MRN Number' },
    { field: document.getElementById('bioBankId'), name: 'Bio Bank ID' },
    { field: document.getElementById('patAge'), name: 'Age' },
    { field: document.querySelector('input[name="customRadio"]:checked'), name: 'Gender' },
    { field: document.getElementById('cancer_type'), name: 'Cancer Type' },
    { field: document.querySelector('input[name="customProcedure"]:checked'), name: 'Procedure Types' },
    { field: document.querySelector('input[name="MetastasisSample"]:checked'), name: 'Metastasis Sample' },
    { field: document.querySelector('input[name="bloodSample"]:checked'), name: 'Blood Sample' },
    { field: document.querySelector('input[name="specimenSample"]:checked'), name: 'Specimen Sample' },
    { field: document.querySelector('input[name="otherSample"]:checked'), name: 'Other Sample' },
    { field: document.querySelector('input[name="rltSample"]:checked'), name: 'RLT Sample' },
    { field: document.querySelector('input[name="pcbSample"]:checked'), name: 'Primary Culture Sample' },

    // { field: document.querySelector('input[name="customConsent"]:checked'), name: 'Consent' },
    // { field: document.querySelector('input[name="IschemicRadio"]:checked'), name: 'Ischemic Sample' },
    // { field: document.querySelector('input[name="processedRadio"]:checked'), name: 'All samples Received Together' }
  ];

  let allFilled = true;
  let biochar = true;
  const emptyFields = [];

  requiredFields.forEach(item => {
    if (!item.field || (item.field.type === 'radio' && !item.field.checked) || (item.field.type === 'number' && item.field.value === '')) {
      allFilled = false;
      emptyFields.push(item.name);
    }
  });

  const bioBankIdField = document.getElementById('bioBankId');
  const invalidCharacter = '/';

  if (bioBankIdField.value.includes(invalidCharacter)) {
    biochar = false;
    emptyFields.push('Bio Bank ID should not contain special character "/"');
  }

  let mode = localStorage.getItem('mode');

  console.log("mode", mode)
  if (mode === "SearchView" || mode === "pendingView") {
    if (!allFilled) {
      console.log('Please fill in the following required fields:', emptyFields.join(', '));
    }
  }
  else if (!allFilled) {
    alert('Please enter all the required fields');
    return;
  }
  else if (!biochar) {
    alert(`The Biobank Id should not contain "/"`);
    return;
  }

  const getDateAndTime = (dateId, timeId) => {
    const dateValue = document.getElementById(dateId).value;
    const timeValue = document.getElementById(timeId).value;

    if (dateValue && timeValue) {
      const dateTimeString = `${dateValue}T${timeValue}`;
      const dateTime = new Date(dateTimeString);

      if (!isNaN(dateTime.getTime())) {
        return dateTime.getTime(); // Returns timestamp in milliseconds
      }
    }
    return null; // If invalid or empty, return null
  };

  // const gridData = (gridValue) => {
  //   const gridVal = document.getElementById(gridValue).value;

  //   if (gridVal) {
  //     let parts = gridVal.split('/');
  //     var updatedgridNo  = [];
  //     let boxName = parts[0];
  //     db.ref(`bn/`).once('value')
  //     .then(snapshot => {
  //       let boxIDs = snapshot.val();
  //       const boxEntry = Object.entries(boxIDs).find(([id, name]) => name === boxName);
  //       const [id, boxData] = boxEntry;
  //       parts[0] = id;
  //       updatedgridNo = parts.join('/');
  //       console.log("updatedgridNo",updatedgridNo)
  //     });
  //     return updatedgridNo;
  //   }
  //   return null; // If invalid or empty, return null
  // };


  const gridData = (gridValue) => {
    return new Promise((resolve) => {
      const gridVal = document.getElementById(gridValue).value;
      if (gridVal) {
        let parts = gridVal.split('/');
        let boxName = parts[0];
        db.ref(`bn/`).once('value').then(snapshot => {
          let boxIDs = snapshot.val();
          const boxEntry = Object.entries(boxIDs).find(([id, name]) => name === boxName);
          if (boxEntry) {
            const [id] = boxEntry;
            parts[0] = id;
            const updatedgridNo = parts.join('/');
            console.log("updatedgridNo", updatedgridNo);
            resolve(updatedgridNo);
          }
          else {
            resolve(gridVal); // If no match found, resolve with original value
          }
        });
      }
      else {
        resolve(null); // If invalid or empty, resolve with null
      }
    });
  };

  let proType = ""
  procType = document.querySelector('input[name="customProcedure"]:checked').value;
  metaType = document.querySelector('input[name="MetastasisSample"]:checked').value;
  if (procType === "b" && metaType === "false") {
    proType = "Bx"
  }
  else if (procType === "b" && metaType === "true") {
    proType = "MBx"
  }
  else if (procType === "r" && metaType === "false") {
    proType = "Sx"
  }
  else if (procType === "r" && metaType === "true") {
    proType = "MSx"
  }


  const aRtimestamp = getDateAndTime('sampleReceivedDate', 'sampleReceivedTime');
  const aPtimestamp = getDateAndTime('sampleProcessedDate', 'sampleProcessedTime');
  const bRtimestamp = getDateAndTime('bloodSampleReceivedDate', 'bloodSampleReceivedTime');
  const bPtimestamp = getDateAndTime('bloodSampleProcessedDate', 'bloodSampleProcessedTime');
  const sRtimestamp = getDateAndTime('SpecimenSampleReceivedDate', 'SpecimenSampleReceivedTime');
  const sPtimestamp = getDateAndTime('SpecimenSampleProcessedDate', 'SpecimenSampleProcessedTime');
  const oRtimestamp = getDateAndTime('OtherSampleReceivedDate', 'OtherSampleReceivedTime');
  const oPtimestamp = getDateAndTime('OtherSampleProcessedDate', 'OtherSampleProcessedTime');
  const rRtimestamp = getDateAndTime('RLTSampleReceivedDate', 'RLTSampleReceivedTime');
  const rPtimestamp = getDateAndTime('RLTSampleProcessedDate', 'RLTSampleProcessedTime');
  const pRtimestamp = getDateAndTime('PCSampleReceivedDate', 'PCSampleReceivedTime');
  const pPtimestamp = getDateAndTime('PCSampleProcessedDate', 'PCSampleProcessedTime');

  const plasmagrid = gridData('PlasmagridNo');
  const Serumgrid = gridData('SerumgridNo');
  const buffyCoatgrid = gridData('bufferCoatgridNo');
  const ftSgrid = gridData('ftgrid');
  const fnSgrid = gridData('fngrid');
  const rltSgrid = gridData('rltSgridNo');
  const pcSgrid = gridData('pcSgridNo');


  return Promise.all([
    gridData('PlasmagridNo'),
    gridData('SerumgridNo'),
    gridData('bufferCoatgridNo'),
    gridData('OSgridNo'),
    gridData('ftgrid'),
    gridData('fngrid'),
    gridData('rltSgridNo'),
    gridData('pcSgridNo')
  ])
    .then(([plasmagrid, Serumgrid, buffyCoatgrid, otherSgrid, ftSgrid, fnSgrid, rltSgrid, pcSgrid]) => {

      const form1Data = {

        ie: {
          ag: document.getElementById('patAge').value,
          sx: document.querySelector('input[name="customRadio"]:checked').value,
          ct: document.getElementById('cancer_type').value,
          // stc: document.querySelector('input[name="radioCancerStage"]:checked').value,
          tpr: document.querySelector('input[name="customProcedure"]:checked').value,
          dpr: document.getElementById('procedureDetail').value,
          srn: document.getElementById('surgeonName').value,
          ss: document.querySelector('input[name="specimenSample"]:checked').value,
          nft: document.getElementById('ft_tubes').value,
          nfn: document.getElementById('fn_tubes').value,
          bs: document.querySelector('input[name="bloodSample"]:checked').value,
          bpg: plasmagrid,
          bsg: Serumgrid,
          bbcg: buffyCoatgrid,
          ftg: ftSgrid,
          fng: fnSgrid,
          osmp: document.querySelector('input[name="otherSample"]:checked').value,
          osg: otherSgrid,
          osdsc: document.getElementById('otSampleDesc').value,
          rltS: document.querySelector('input[name="rltSample"]:checked').value,
          rlt: rltSgrid,
          pcS: document.querySelector('input[name="pcbSample"]:checked').value,
          pc: pcSgrid,
          mts: document.querySelector('input[name="MetastasisSample"]:checked').value,
          mspt: proType,
          cnst: document.querySelector('input[name="customConsent"]:checked')?.value || '',
          iss: document.querySelector('input[name="IschemicRadio"]:checked')?.value || '',
          nact: document.querySelector('input[name="NACT"]:checked')?.value || "",
          nactdc: document.getElementById('NACT_cycle').value || "",
          nactdlc: document.getElementById('NACT_cycle_D').value || "",
          prb: document.getElementById('processedBy').value,
          scpt: document.querySelector('input[name="processedRadio"]:checked')?.value || '',
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
          bspb: document.getElementById('BprocessedBy').value,
          sspb: document.getElementById('SprocessedBy').value,
          ospb: document.getElementById('OprocessedBy').value,
          rltpb: document.getElementById('RLTprocessedBy').value,
          psspb: document.getElementById('PCprocessedBy').value,
          sef_ub: user
        }
      };
      return form1Data;
    });
}


// Validate Form 2
function validateForm2() {

  let tL = document.getElementById('tumorSizeL').value;
  let tW = document.getElementById('tumorSizeW').value;
  let tH = document.getElementById('tumorSizeH').value;
  let tumorSize = `${tL}x${tW}x${tH}`;
  let ajcc1 = document.getElementById('AJCC1').value; 
  let ajcc2 = document.getElementById('AJCC2').value; 
  let ajcc = `${ajcc1}${ajcc2}`;
  const form2Data = {
    md: {
      // fhc: document.querySelector('input[name="RadioFHabit"]:checked')?.value === 'true' ? true : false || false,
      // fhcr: document.getElementById('familyRelation').value || "",
      // fhct: document.getElementById('familyCancerType').value || "",
      // fh: document.querySelector('input[name="RadioFdHabit"]:checked')?.value === 'true' ? true : false || false,
      // hac: document.querySelector('input[name="RadioAlcoholHabit"]:checked')?.value === 'true' ? true : false || false,
      // hs: document.querySelector('input[name="RadioSmokeHabit"]:checked')?.value === 'true' ? true : false || false,
      // ec: document.querySelector('input[name="ECH"]:checked')?.value === 'true' ? true : false || false,
      // ecm: document.getElementById('comorbidityMedications').value || "",
      // ffqc: document.getElementById('ffQcComments').value || "",
      // ftr: document.getElementById('ffTissueRemarks').value || "",
      // tst: document.querySelector('input[name="tumorSite"]:checked')?.value === 'true' ? true : false || false,
      // tp: Number(document.getElementById('tumorPercentage').value) || 0,
      // ad: Number(document.getElementById('ageAtDiagnosis').value) || 0,
      // cs: document.getElementById('clinicalStage')?.value || "",
      // ihcm: document.querySelector('input[name="IHC"]:checked')?.value === 'true' ? true : false || false,
      // ihcd: document.getElementById('IHC_Description')?.value || "",
      // gt: document.querySelector('input[name="GeneticT"]:checked')?.value === 'true' ? true : false || false,
      // gtd: document.getElementById('GT_Description')?.value || "",
      // pst: document.getElementById('subtype').value || "",
      // gd: document.getElementById('sampleGrade').value || "",
      // fc: document.querySelector('input[name="focal"]:checked')?.value === 'true' ? true : false || false,
      // lvi: document.querySelector('input[name="LVI"]:checked')?.value === 'true' ? true : false || false,
      // pni: document.querySelector('input[name="PNI"]:checked')?.value === 'true' ? true : false || false,
      // ptnm: document.getElementById('pTNM')?.value || "",
      // as: document.getElementById('AJCC').value || "",
      // nnt: Number(document.getElementById('nodesTested').value) || 0,
      // npn: Number(document.getElementById('positiveNodes').value) || 0,
      // tsz: tumorSize,
      // dm: document.querySelector('input[name="denovo"]:checked')?.value === 'true' ? true : false || false,
      // mpt: document.querySelector('input[name="MPT"]:checked')?.value === 'true' ? true : false || false,
      // btn: document.getElementById('btHPEInput').value || "",
      // bd: document.getElementById('biopsyDate').value || "",
      // nact: document.querySelector('input[name="NACT"]:checked')?.value === 'true' ? true : false || false,
      // nactdc: document.getElementById('NACT_cycle').value || "",
      // nactdlc: document.getElementById('NACT_cycle_D').value || "",
      // stn: document.getElementById('StHPEInput').value || "",
      // sd: document.getElementById('surgeryDate').value || "",
      // rcbs: Number(document.getElementById('rcbScores').value) || 0,
      // act: document.querySelector('input[name="ACT"]:checked')?.value === 'true' ? true : false || false,
      // actdc: document.getElementById('actDrugCycles').value || "",
      // actdls: document.getElementById('actDateLastCycle').value || "",
      // rd: document.querySelector('input[name="RadioT"]:checked')?.value === 'true' ? true : false || false,
      // rdd: document.getElementById('radiotherapyDetails').value || "",
      // rtdls: document.getElementById('radiotherapyLastCycleDate').value || "",
      fhc: document.querySelector('input[name="RadioFHabit"]:checked')?.value || "",
      fhcr: document.getElementById('familyRelation').value || "",
      fhct: document.getElementById('familyCancerType').value || "",
      fh: document.querySelector('input[name="RadioFdHabit"]:checked')?.value || "",
      hac: document.querySelector('input[name="RadioAlcoholHabit"]:checked')?.value || "",
      hs: document.querySelector('input[name="RadioSmokeHabit"]:checked')?.value || "",
      ec: document.querySelector('input[name="ECH"]:checked')?.value || "",
      ecm: document.getElementById('comorbidityMedications').value || "",
      ffqc: document.getElementById('ffQcComments').value || "",
      ftr: document.getElementById('ffTissueRemarks').value || "",
      tst: document.querySelector('input[name="tumorSite"]:checked')?.value || "",
      tp: document.getElementById('tumorPercentage').value || "",
      ad: document.getElementById('ageAtDiagnosis').value || "",
      cs: document.getElementById('clinicalStage')?.value || "",
      ihcm: document.querySelector('input[name="IHC"]:checked')?.value || "",
      ihcd: document.getElementById('IHC_Description')?.value || "",
      gt: document.querySelector('input[name="GeneticT"]:checked')?.value || "",
      gtd: document.getElementById('GT_Description')?.value || "",
      pst: document.getElementById('subtype').value || "",
      pstOt: document.getElementById('pstOt').value || "",
      gd: document.getElementById('sampleGrade')?.value || "",
      fc: document.querySelector('input[name="focal"]:checked')?.value || "",
      dcis: document.querySelector('input[name="dcis"]:checked')?.value || "",
      dcisgd: document.getElementById('dcisGrade')?.value || "",
      lvi: document.querySelector('input[name="LVI"]:checked')?.value || "",
      pni: document.querySelector('input[name="PNI"]:checked')?.value || "",
      ptnm: document.getElementById('pTNM')?.value || "",
      as: ajcc || "",
      nnt: document.getElementById('nodesTested').value || "",
      npn: document.getElementById('positiveNodes').value || "",
      tsz: tumorSize,
      dm: document.querySelector('input[name="denovo"]:checked')?.value || "",
      mpt: document.querySelector('input[name="MetaPT"]:checked')?.value || "",
      mptA: document.getElementById('mpt_age').value || "",
      mptS: document.getElementById('mpt_site').value || "",
      mptRS: document.getElementById('mpt_rs').value || "",

      // btn: document.getElementById('btHPEInput').value || "",
      // bd: document.getElementById('biopsyDate').value || "",
      // stn: document.getElementById('StHPEInput').value || "",
      // sd: document.getElementById('surgeryDate').value || "",
      rcbs: document.getElementById('rcbScores').value || "",
      rcbc: document.getElementById('rcbClass').value || "",
      act: document.querySelector('input[name="ACT"]:checked')?.value || "",
      actdc: document.getElementById('actDrugCycles').value || "",
      actdls: document.getElementById('actDateLastCycle').value || "",
      rd: document.querySelector('input[name="RadioT"]:checked')?.value || "",
      rdd: document.getElementById('radiotherapyDetails').value || "",
      rtdls: document.getElementById('radiotherapyLastCycleDate').value || "",
      mdu: user,
      //ipba: document.querySelector('input[name="pbT"]:checked')?.value === 'true' ? true : false || false
      ipba: document.querySelector('input[name="pbT"]:checked')?.value || "",
      ipbainfo: document.getElementById('PBInput')?.value || ""
    }
  };

  // // Check if all necessary fields are filled in Form 2
  // for (const key in form2Data.md) {
  //   if (!form2Data.md[key]) {
  //     alert(`Please fill in the field: ${key}`);
  //     return false;
  //   }
  // }

  return form2Data;
}

// Validate Form 3
function validateForm3() {
  const form3Data = {
    brf: {
      // am: Number(document.getElementById('ageAtMenarche').value) || 0,
      // pty: Number(document.getElementById('parity').value) || 0,
      // noc: Number(document.getElementById('numChild').value) || 0,
      // afc: Number(document.getElementById('ageAtFirstChild').value) || 0,
      // bf: document.querySelector('input[name="breFd"]:checked')?.value === 'true' ? true : false || false,
      // dbf: document.getElementById('dbf').value || "",
      // ms: document.querySelector('input[name="mStatus"]:checked')?.value || "",
      // ad: Number(document.getElementById('ad').value) || 0,
      // er: document.querySelector('input[name="ERRadio"]:checked')?.value === 'true' ? true : false || false,
      // pr: document.querySelector('input[name="PRRadio"]:checked')?.value === 'true' ? true : false || false,
      // h2: document.querySelector('input[name="HER2Radio"]:checked')?.value === 'true' ? true : false || false,
      // sbt: document.getElementById('sbt').value || "",
      // k67: Number(document.getElementById('k67').value) || 0,
      // cs: document.getElementById('ClinicalS').value || "",
      // ht: document.getElementById('HistologicalS').value || "",
      // sps: Number(document.getElementById('sps').value) || 0,
      am: document.getElementById('ageAtMenarche').value || "",
      pty: document.getElementById('parity').value || "",
      noc: document.getElementById('numChild').value || "",
      afc: document.getElementById('ageAtFirstChild').value || "",
      bf: document.querySelector('input[name="breFd"]:checked')?.value || "",
      dbf: document.getElementById('dbf').value || "",
      ms: document.querySelector('input[name="mStatus"]:checked')?.value || "",
      // ad: document.getElementById('ad').value || "",
      er: document.querySelector('input[name="ERRadio"]:checked')?.value || "",
      pr: document.querySelector('input[name="PRRadio"]:checked')?.value || "",
      h2: document.querySelector('input[name="HER2Radio"]:checked')?.value || "",
      sbt: document.getElementById('sbt').value || "",
      k67: document.getElementById('k67').value || "",
      // cs: document.getElementById('ClinicalS').value || "",
      ht: document.getElementById('HistologicalS').value || "",
      sps: document.getElementById('sps').value || "",
      brfu: user
    }
  };

  // // Check if all necessary fields are filled in Form 3
  // for (const key in form3Data.brf) {
  //   if (!form3Data.brf[key]) {
  //     alert(`Please fill in the field: ${key}`);
  //     return false;
  //   }
  // }

  return form3Data;
}

// Save data to Firebase
function saveToFirebase(data) {
  const bioBankId = document.getElementById('bioBankId').value;
  const timestamp = Math.floor(Date.now() / 1000);

  db.ref(`sef/${bioBankId}`).once('value', snapshot => {
    const sections = snapshot.val();
    let nextSectionIndex = 1;

    if (sections) {
      const sectionKeys = Object.keys(sections);
      sectionKeys.forEach(key => {
        const sectionNumber = parseInt(key.replace('s', ''), 10);
        if (sectionNumber >= nextSectionIndex) {
          nextSectionIndex = sectionNumber + 1;
        }
      });
    }

    const nextSection = `s${nextSectionIndex}`;

    const formattedData = {
      ie: data.ie,
      md: data.md,
      brf: data.brf
    };
    // console.log("Happy Friday")
    db.ref(`sef/${bioBankId}/${nextSection}/${timestamp}`).set(data)
      .then(() => {
        // alert('Form submitted successfully to ' + nextSection);
        alert('Form submitted successfully ');

      })
      .catch((error) => {
        console.error('Error writing to Firebase', error);
      });


    const mrnData = document.getElementById('mrnNo').value;
    db.ref(`bbnmrn/${mrnData}`).set(bioBankId)
      .then(() => {
        console.log('stored in bbnmrn');
      })
      .catch((error) => {
        console.log('Not stored in bbnmrn');
      });



    const dueDate = new Date();
    // dueDate.setMonth(dueDate.getMonth() + 6);  // Add 6 months to the current date
    dueDate.setMinutes(dueDate.getMinutes() + 3);  // Add 10 days to the current date
    // dueDate.setMinutes(dueDate.getMinutes() + 10 * 24 * 60);  // Add 10 days to the current date


    const bioBankPath = `pfw/${bioBankId}`;
    console.log("dueDate", dueDate);  // Logs the correct Date object

    db.ref(bioBankPath).once('value')
      .then((snapshot) => {
        if (snapshot.exists()) {
          console.log('Path already exists. Not storing in pfw.');
        } else {
          // Convert the dueDate to a timestamp before storing
          db.ref(bioBankPath).set(dueDate.getTime())  // Store as Unix timestamp (milliseconds since 1970)
            .then(() => {
              console.log('Stored in pfw');
              let mode = localStorage.getItem('mode');
              switch (mode) {
                case 'SearchView':
                  window.location.href = `search.html`;
                  break;
                case 'SearchEdit':
                  window.location.href = `search.html`;
                  break;
                case 'PendingView':
                  window.location.href = `todo.html`;
                  break;
                case 'PendingEdit':
                  window.location.href = `todo.html`;
                  break;
                case 'EditFollowUps':
                  window.location.href = `todo.html`;
                  break;
                case 'ViewFollowUp':
                  window.location.href = `todo.html`;
                  break;
                case 'undefined':
                  window.location.href = `home.html`;
                  break;
                default:
                  console.error('Unknown mode:', mode);
              }

            })
            .catch((error) => {
              console.log('Error storing in pfw:', error);
            });
        }
      })
      .catch((error) => {
        console.log('Error checking path existence:', error);
      });

  });

}

function updateToFirebase(data) {
  const bioBankId = document.getElementById('bioBankId').value;
  const timestamp = Math.floor(Date.now() / 1000);

  console.log("Hi Bhanu")

  db.ref(`sef/${bioBankId}`).once('value', snapshot => {
    const sections = snapshot.val();

    if (sections) {
      const sectionKeys = Object.keys(sections);
      const lastSection = sectionKeys[sectionKeys.length - 1];
      const formattedData = {
        ie: data.ie,
        md: data.md,
        brf: data.brf
      };

      db.ref(`sef/${bioBankId}/${lastSection}/${timestamp}`).set(formattedData)
        .then(() => {
          alert('Form submitted successfully to ' + lastSection);
          let user = sessionStorage.getItem('userName');
          let mode = localStorage.getItem("mode")

          let act = {
            "mode": "",
            "user": user
          };
          if (mode === "SearchEdit" || mode === "PendingEdit") {
            db.ref(`act/${bioBankId}/${lastSection}`).set(act)
              .then(() => {
                console.log("New act set, proceeding with pages_display.");
                validateAndCollectData();
              })
              .catch((error) => {
                console.error("Error setting new act: ", error);
              });
          }
          else {
            validateAndCollectData();
          }
        })
        .catch((error) => {
          console.error('Error writing to Firebase', error);
        });

    } else {
      const firstSection = `s1`;

      db.ref(`sef/${bioBankId}/${firstSection}/${timestamp}`).set(data)
        .then(() => {
          alert('Form submitted successfully to ' + firstSection);

          db.ref(`bb/${boxName}/${seatIndex}`).update(seatUpdate)
            .then(() => {
              console.log(`Seat ${seatID} updated successfully in Firebase.`);
            })
            .catch(error => {
              console.error(`Error updating seat ${seatID}:`, error);
            });

        })
        .catch((error) => {
          console.error('Error writing to Firebase', error);
        });
    }

    const mrnData = document.getElementById('mrnNo').value;
    db.ref(`bbnmrn/${mrnData}`).set(bioBankId)
      .then(() => {
        let mode = localStorage.getItem('mode');

        console.log('Stored in bbnmrn');
        switch (mode) {
          case 'SearchView':
            window.location.href = `search.html`;
            break;
          case 'SearchEdit':
            window.location.href = `search.html`;
            break;
          case 'PendingView':
            window.location.href = `todo.html`;
            break;
          case 'PendingEdit':
            window.location.href = `todo.html`;
            break;
          case 'EditFollowUps':
            window.location.href = `todo.html`;
            break;
          case 'ViewFollowUp':
            window.location.href = `todo.html`;
            break;
          case 'undefined':
            window.location.href = `home.html`;
            break;

          default:
            console.error('Unknown mode:', mode);
        }
      })
      .catch((error) => {
        console.log('Not stored in bbnmrn');
      });
  });
}



function patients() {
  const bioBankId = document.getElementById('bioBankId').value;
  const timestamp = Math.floor(Date.now() / 1000); // Current timestamp

  let smtyArray = [];
  const bloodSampleSelected = document.getElementById('bloodSampleY').checked;
  const specimenSampleSelected = document.getElementById('specimenSampleY').checked;
  const otherSampleSelected = document.getElementById('otherSampleY').checked;

  if (bloodSampleSelected) smtyArray.push('B');
  if (specimenSampleSelected) smtyArray.push('S');
  if (otherSampleSelected) smtyArray.push('O');

  // Join the selected samples into a single string (e.g., "B,S,O")
  const smty = smtyArray.join(',');

  db.ref(`Patients/${bioBankId}`).once('value', snapshot => {
    const sections = snapshot.val();
    let nextSectionIndex = 1; // Start with 's1'

    if (sections) {
      // Check the highest existing section
      const sectionKeys = Object.keys(sections);
      sectionKeys.forEach(key => {
        const sectionNumber = parseInt(key.replace('s', ''), 10);
        if (sectionNumber >= nextSectionIndex) {
          nextSectionIndex = sectionNumber + 1;
        }
      });
    }

    // Generate the next section name (s[i+1])
    const nextSection = `s${nextSectionIndex}`;

    // Get the data from the form inputs
    const patientInfo = {
      age: document.getElementById('patAge').value, // Assuming 'patAge' is the age input field
      gndr: document.querySelector('input[name="customRadio"]:checked')?.value || '', // Gender
      ct: document.querySelector('input[name="radioCancerType"]:checked')?.value || '', // Type of Cancer
      grc: document.getElementById('sampleGrade')?.value || "", // Grade of Cancer
      smty: smty || "",
      typ: document.querySelector('input[name="customProcedure"]:checked').value, // Type of Procedure
      ts: timestamp
    };

    // Save the structured data to the next available section with the timestamp
    db.ref(`Patients/${bioBankId}/${nextSection}`).set(patientInfo)
      .then(() => {
        alert('Patient info submitted successfully to ' + nextSection);

      })
      .catch((error) => {
        console.error('Error writing to Firebase', error);
      });

    const mrnData = document.getElementById('mrnNo').value; // If you need to handle MRN number as well

  });
}





const upUrlParams = new URLSearchParams(window.location.search);
const update = upUrlParams.get('upadte');



function pages_display(mode, bioBankId, seq, timestampKey) {
  console.log("mode", mode);
  console.log("bioBankId", bioBankId);
  console.log("seq", seq);
  console.log("timestampKey", timestampKey);
  localStorage.setItem("bioBankId", bioBankId);
  localStorage.setItem("lastSection", seq);

  if (seq != '') {
    var dataPath = `sef/${bioBankId}/${seq}/${timestampKey}`;
  }
  else {
    var dataPath = `Fw/${bioBankId}/${timestampKey}`;
  }
  console.log("datapath", dataPath);
  console.log("DataConfig", db);

  localStorage.setItem('bioid', bioBankId);
  localStorage.setItem('mode', mode)


  if (mode != "") {
    console.log('dataPath', dataPath);
    db.ref(dataPath).once('value')
      .then(snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          console.log("Fetched data:", data);
          sessionStorage.setItem('formData', JSON.stringify(data));
          const storedData = sessionStorage.getItem('formData');
          if (storedData) {
            const parsedData = JSON.parse(storedData); // Convert it back to an object
            console.log('parsedData', parsedData); // Print the data to the console
          } else {
            console.log('No formData found in sessionStorage');
          }
          // Handle different modes
          switch (mode) {
            case 'SearchView':
            case 'PendingView':
              localStorage.setItem("selectedGrid", "");
              window.location.href = `default.html?hideMnrId=true`;
              break;
            case 'SearchEdit':
            case 'PendingEdit':
              localStorage.setItem("selectedGrid", "");
              window.location.href = `default.html?update=true`;
              break;
            case 'EditFollowUps':
              localStorage.setItem("selectedGrid", "");
              window.location.href = `default.html?mode=edit`;
              break;
            case 'ViewFollowUp':
              localStorage.setItem("selectedGrid", "");
              window.location.href = `default.html?mode=view`;
              break;
            // case 'sharedView':
            // localStorage.setItem("selectedGrid", "");
            // window.location.href = `default.html?shared=true`;
            // break;

            default:
              console.error('Unknown mode:', mode);
          }
        } else {
          console.error('No data found at the specified path');
          // Optionally, redirect or display a message to the user
        }
      }).catch(error => {
        console.error("Error fetching data:", error);
      });
  }
  else if (mode === "") {
    localStorage.setItem("selectedGrid", "");
    window.location.href = "default.html";
  }
  // else if(mode === undefined){
  //   const formElements = [
  //     ...document.querySelectorAll('input, select, textarea'),
  //   ];

  //     // Disable all elements
  //     formElements.forEach((element) => {
  //       element.disabled = true;
  //     });

  //     return; // Exit the function if `pst` is not available

  // }
}


async function fillIeForm(ieData) {

  const gridData = (gridValue) => {
    return new Promise((resolve) => {
      const gridVal = gridValue;
      if (gridVal) {
        let parts = gridVal.split('/');
        let boxID = parts[0];
        db.ref(`bn/`).once('value').then(snapshot => {
          let boxIDs = snapshot.val();
          const boxEntry = Object.entries(boxIDs).find(([id, name]) => id === boxID);
          if (boxEntry) {
            const [id, name] = boxEntry;
            parts[0] = name;
            const updatedgridNo = parts.join('/');
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

  const bioid = localStorage.getItem('bioid')
  console.log("bibioBankId", bioid);
  document.getElementById('bioBankId').value = bioid;
  document.getElementById('patAge').value = ieData.ag || '';
  document.querySelector(`input[name="customRadio"][value="${ieData.sx}"]`).checked = true || '';
  document.getElementById("cancer_type").value = ieData.ct || '';
  // document.querySelector(`input[name="radioCancerStage"][value="${ieData.stc}"] `).checked = true || '';
  document.querySelector(`input[name="customProcedure"][value="${ieData.tpr}"]`).checked = true;
  document.getElementById('procedureDetail').value = ieData.dpr || '';
  document.getElementById('surgeonName').value = ieData.srn;
  console.log("surgeonName", ieData.srn)
  document.querySelector(`input[name="specimenSample"][value="${ieData.ss}"]`).checked = true;
  specimenSample();

  document.getElementById('ft_tubes').value = ieData.nft || '';

  const ftGridNo = await gridData(ieData.ftg);
  document.getElementById('ftgrid').value = ftGridNo || '';

  const fnGridNo = await gridData(ieData.fng);
  document.getElementById('fngrid').value = fnGridNo || '';
  document.getElementById('fn_tubes').value = ieData.nfn || '';
  document.querySelector(`input[name="bloodSample"][value="${ieData.bs}"]`).checked = true;
  bloodSample();

  const plasmaGridNo = await gridData(ieData.bpg);
  document.getElementById('PlasmagridNo').value = plasmaGridNo || '';  // Set the resolved value

  const SerumGridNo = await gridData(ieData.bsg);
  document.getElementById('SerumgridNo').value = SerumGridNo || '';

  const BuffyGridNo = await gridData(ieData.bbcg);
  document.getElementById('bufferCoatgridNo').value = BuffyGridNo || '';

  document.querySelector(`input[name="otherSample"][value="${ieData.osmp}"]`).checked = true;
  otherSample();

  const otherGridNo = await gridData(ieData.osg);
  document.getElementById('OSgridNo').value = otherGridNo || '';
  document.getElementById('otSampleDesc').value = ieData.osdsc || '';

  document.querySelector(`input[name="rltSample"][value="${ieData.rltS}"]`).checked = true;
  rltSample();

  const rltSgridNo = await gridData(ieData.rlt);
  document.getElementById('rltSgridNo').value = rltSgridNo || '';
  document.querySelector(`input[name="pcbSample"][value="${ieData.pcS}"]`).checked = true;
  pcbSample();
  const pcSgridNo = await gridData(ieData.pc);
  document.getElementById('pcSgridNo').value = pcSgridNo || '';
  document.querySelector(`input[name="MetastasisSample"][value="${ieData.mts}"]`).checked = true;
  if (ieData.cnst !== '') {
    document.querySelector(`input[name="customConsent"][value="${ieData.cnst}"]`).checked = true;
  }
  if (ieData.iss !== '') {
    document.querySelector(`input[name="IschemicRadio"][value="${ieData.iss}"]`).checked = true;
  }
  if (ieData.nact) document.querySelector(`input[name="NACT"][value="${ieData.nact}"]`).checked = true;
  NactYes();
  document.getElementById('NACT_cycle').value = ieData.nactdc || '';
  document.getElementById('NACT_cycle_D').value = ieData.nactdlc || '';
  document.getElementById('processedBy').value = ieData.prb || '';
  if (ieData.scpt !== '') {
    document.querySelector(`input[name="processedRadio"][value="${ieData.scpt}"]`).checked = true;
  }
  sampleReceive()
  document.getElementById('BprocessedBy').value = ieData.bspb || '';
  document.getElementById('SprocessedBy').value = ieData.sspb || '';
  document.getElementById('OprocessedBy').value = ieData.ospb || '';
  document.getElementById('RLTprocessedBy').value = ieData.rltpb || '';
  document.getElementById('PCprocessedBy').value = ieData.psspb || '';

  document.getElementById('sefdataEB').value = ieData.sef_ub || '';


  const formatTimestamp = (timestamp) => {
    if (!timestamp) return { date: '', time: '' };
    const dateObj = new Date(timestamp);
    const date = dateObj.toISOString().split('T')[0];
    const time = dateObj.toTimeString().split(' ')[0];
    return { date, time };
  };

  // Populate form fields with date and time
  const srt = formatTimestamp(ieData.srt);
  document.getElementById('sampleReceivedDate').value = srt.date;
  document.getElementById('sampleReceivedTime').value = srt.time;

  const spt = formatTimestamp(ieData.spt);
  document.getElementById('sampleProcessedDate').value = spt.date;
  document.getElementById('sampleProcessedTime').value = spt.time;

  const brt = formatTimestamp(ieData.brt);
  document.getElementById('bloodSampleReceivedDate').value = brt.date;
  document.getElementById('bloodSampleReceivedTime').value = brt.time;

  const bpt = formatTimestamp(ieData.bpt);
  document.getElementById('bloodSampleProcessedDate').value = bpt.date;
  document.getElementById('bloodSampleProcessedTime').value = bpt.time;

  const sprt = formatTimestamp(ieData.sprt);
  document.getElementById('SpecimenSampleReceivedDate').value = sprt.date;
  document.getElementById('SpecimenSampleReceivedTime').value = sprt.time;

  const sppt = formatTimestamp(ieData.sppt);
  document.getElementById('SpecimenSampleProcessedDate').value = sppt.date;
  document.getElementById('SpecimenSampleProcessedTime').value = sppt.time;

  const osrt = formatTimestamp(ieData.osrt);
  document.getElementById('OtherSampleReceivedDate').value = osrt.date;
  document.getElementById('OtherSampleReceivedTime').value = osrt.time;

  const ospt = formatTimestamp(ieData.ospt);
  document.getElementById('OtherSampleProcessedDate').value = ospt.date;
  document.getElementById('OtherSampleProcessedTime').value = ospt.time;

  const rltrt = formatTimestamp(ieData.rltrt);
  document.getElementById('RLTSampleReceivedDate').value = rltrt.date;
  document.getElementById('RLTSampleReceivedTime').value = rltrt.time;

  const rltpt = formatTimestamp(ieData.rltpt);
  document.getElementById('RLTSampleProcessedDate').value = rltpt.date;
  document.getElementById('RLTSampleProcessedTime').value = rltpt.time;

  const pssrt = formatTimestamp(ieData.pssrt);
  document.getElementById('PCSampleReceivedDate').value = pssrt.date;
  document.getElementById('PCSampleReceivedTime').value = pssrt.time;

  const psspb = formatTimestamp(ieData.psspb);
  document.getElementById('PCSampleProcessedDate').value = psspb.date;
  document.getElementById('PCSampleProcessedTime').value = psspb.time;

}


// function fillMdForm(mdData) {
//   document.getElementById('mddataEB').value = mdData.mdu || 'currentUser';
//   document.querySelector(`input[name="RadioFHabit"][value="${mdData.fhc}"]`).checked = true;
//   document.getElementById('familyRelation').value = mdData.fhcr || '';
//   document.getElementById('familyCancerType').value = mdData.fhct || '';
//   document.querySelector(`input[name="RadioFdHabit"][value="${mdData.fh}"]`).checked = true;
//   document.querySelector(`input[name="RadioAlcoholHabit"][value="${mdData.hac}"]`).checked = true;
//   document.querySelector(`input[name="RadioSmokeHabit"][value="${mdData.hs}"]`).checked = true;
//   document.querySelector(`input[name="ECH"][value="${mdData.ec}"]`).checked = true;
//   document.getElementById('comorbidityMedications').value = mdData.ecm || '';
//   document.getElementById('ffQcComments').value = mdData.ffqc || '';
//   document.getElementById('ffTissueRemarks').value = mdData.ftr || '';
//   document.querySelector(`input[name="tumorSite"][value="${mdData.tst}"]`).checked = true;
//   document.getElementById('tumorPercentage').value = mdData.tp || '';
//   document.getElementById('ageAtDiagnosis').value = mdData.ad || '';
//   document.getElementById('clinicalStage').value = mdData.cs || '';
//   document.querySelector(`input[name="IHC"][value="${mdData.ihcm}"]`).checked = true;
//   document.getElementById('IHC_Description').value = mdData.ihcd || '';
//   document.querySelector(`input[name="GeneticT"][value="${mdData.gt}"]`).checked = true;
//   document.getElementById('GT_Description').value = mdData.gtd || '';
//   document.getElementById('subtype').value = mdData.pst || '';
//   document.getElementById('sampleGrade').value = mdData.gd || '';
//   document.querySelector(`input[name="focal"][value="${mdData.fc}"]`).checked = true;
//   document.querySelector(`input[name="LVI"][value="${mdData.lvi}"]`).checked = true;
//   document.querySelector(`input[name="PNI"][value="${mdData.pni}"]`).checked = true;
//   document.getElementById('pTNM').value = mdData.ptnm || '';
//   document.getElementById('AJCC').value = mdData.as || '';
//   document.getElementById('nodesTested').value = mdData.nnt || '';
//   document.getElementById('positiveNodes').value = mdData.npn || '';
//   if (mdData.tsz) {
//     const [tL, tW, tH] = mdData.tsz.split('x');

//     document.getElementById('tumorSizeL').value = tL;
//     document.getElementById('tumorSizeW').value = tW;
//     document.getElementById('tumorSizeH').value = tH;
//   }
//   document.querySelector(`input[name="denovo"][value="${mdData.dm}"]`).checked = true;
//   document.querySelector(`input[name="MPT"][value="${mdData.mpt}"]`).checked = true;
//   document.getElementById('btHPEInput').value = mdData.btn || '';
//   document.getElementById('biopsyDate').value = mdData.bd || '';
//   document.querySelector(`input[name="NACT"][value="${mdData.nact}"]`).checked = true;
//   document.getElementById('NACT_cycle').value = mdData.nactdc || '';
//   document.getElementById('NACT_cycle_D').value = mdData.nactdlc || '';
//   document.getElementById('StHPEInput').value = mdData.stn || '';
//   document.getElementById('surgeryDate').value = mdData.sd || '';
//   document.getElementById('rcbScores').value = mdData.rcbs || '';
//   document.querySelector(`input[name="ACT"][value="${mdData.act}"]`).checked = true;
//   document.getElementById('actDrugCycles').value = mdData.actdc || '';
//   document.getElementById('actDateLastCycle').value = mdData.actdls || '';
//   document.querySelector(`input[name="RadioT"][value="${mdData.rd}"]`).checked = true;
//   document.getElementById('radiotherapyDetails').value = mdData.rdd || '';
//   document.getElementById('radiotherapyLastCycleDate').value = mdData.rtdls || '';
//   document.querySelector(`input[name="pbT"][value="${mdData.ipba}"]`).checked = true;
// }

function fillMdForm(mdData) {
  const formElements = [
    ...document.querySelectorAll('input, select, textarea'),
  ];

  // if (!mdData.pst) {
  //   // Disable all elements
  //   formElements.forEach((element) => {
  //     element.disabled = true;
  //   });

  //   return; // Exit the function if `pst` is not available
  // }

  // Enable elements if `pst` has a value
  // formElements.forEach((element) => {
  //   element.disabled = false;
  // });
  if (mdData.fhc !== '') {
    document.querySelector(`input[name="RadioFHabit"][value="${mdData.fhc}"]`).checked = true;
  }
  familyHabitToggle();
  document.getElementById('familyRelation').value = mdData.fhcr || '';
  document.getElementById('familyCancerType').value = mdData.fhct || '';

  if (mdData.fh) document.querySelector(`input[name="RadioFdHabit"][value="${mdData.fh}"]`).checked = true;
  if (mdData.hac) document.querySelector(`input[name="RadioAlcoholHabit"][value="${mdData.hac}"]`).checked = true;
  if (mdData.hs) document.querySelector(`input[name="RadioSmokeHabit"][value="${mdData.hs}"]`).checked = true;
  if (mdData.ec) document.querySelector(`input[name="ECH"][value="${mdData.ec}"]`).checked = true;
  ExistComorbidity();
  document.getElementById('comorbidityMedications').value = mdData.ecm || '';
  document.getElementById('ffQcComments').value = mdData.ffqc || '';
  document.getElementById('ffTissueRemarks').value = mdData.ftr || '';
  if (mdData.tst) document.querySelector(`input[name="tumorSite"][value="${mdData.tst}"]`).checked = true;
  document.getElementById('tumorPercentage').value = mdData.tp || '';
  document.getElementById('ageAtDiagnosis').value = mdData.ad || '';
  document.getElementById('clinicalStage').value = mdData.cs || '';
  if (mdData.ihcm) document.querySelector(`input[name="IHC"][value="${mdData.ihcm}"]`).checked = true;
  IHCMarker();

  document.getElementById('IHC_Description').value = mdData.ihcd || '';
  if (mdData.gt) document.querySelector(`input[name="GeneticT"][value="${mdData.gt}"]`).checked = true;
  GeneticT();
  document.getElementById('GT_Description').value = mdData.gtd || '';
  document.getElementById('subtype').value = mdData.pst || '';
  document.getElementById('pstOt').value = mdData.pstOt || '';
  document.getElementById('sampleGrade').value = mdData.gd || '';
  if (mdData.fc) document.querySelector(`input[name="focal"][value="${mdData.fc}"]`).checked = true;
  if (mdData.dcis) document.querySelector(`input[name="dcis"][value="${mdData.dcis}"]`).checked = true;
  document.getElementById('dcisGrade').value = mdData.dcisgd || '';
  if (mdData.lvi) document.querySelector(`input[name="LVI"][value="${mdData.lvi}"]`).checked = true;
  if (mdData.pni) document.querySelector(`input[name="PNI"][value="${mdData.pni}"]`).checked = true;
  document.getElementById('pTNM').value = mdData.ptnm || '';
  if(mdData.as){
    let ajcc = mdData.as;
    let ajcc1 = ajcc.slice(0, -1);
    let ajcc2 = ajcc.slice(-1);
    document.getElementById('AJCC1').value = ajcc1 || '';
    document.getElementById('AJCC2').value = ajcc2 || '';
  }  
  document.getElementById('nodesTested').value = mdData.nnt || '';
  document.getElementById('positiveNodes').value = mdData.npn || '';
  if (mdData.tsz) {
    const [tL, tW, tH] = mdData.tsz.split('x');

    document.getElementById('tumorSizeL').value = tL;
    document.getElementById('tumorSizeW').value = tW;
    document.getElementById('tumorSizeH').value = tH;
  }
  if (mdData.dm) document.querySelector(`input[name="denovo"][value="${mdData.dm}"]`).checked = true;
  if (mdData.mpt) document.querySelector(`input[name="MetaPT"][value="${mdData.mpt}"]`).checked = true;
    document.getElementById('mpt_age').value = mdData.mptA || '';
    document.getElementById('mpt_site').value = mdData.mptS || '';
    document.getElementById('mpt_rs').value = mdData.mptRS || '';
  // document.getElementById('btHPEInput').value = mdData.btn || '';
  // document.getElementById('biopsyDate').value = mdData.bd || '';
  // document.getElementById('StHPEInput').value = mdData.stn || '';
  // document.getElementById('surgeryDate').value = mdData.sd || '';
  document.getElementById('rcbScores').value = mdData.rcbs || '';
  document.getElementById('rcbClass').value = mdData.rcbc || '';

  if (mdData.act) document.querySelector(`input[name="ACT"][value="${mdData.act}"]`).checked = true;
  actYes();
  document.getElementById('actDrugCycles').value = mdData.actdc || '';
  document.getElementById('actDateLastCycle').value = mdData.actdls || '';
  if (mdData.rd) document.querySelector(`input[name="RadioT"][value="${mdData.rd}"]`).checked = true;
  RadioTYes();
  document.getElementById('radiotherapyDetails').value = mdData.rdd || '';
  document.getElementById('radiotherapyLastCycleDate').value = mdData.rtdls || '';
  if (mdData.ipba) document.querySelector(`input[name="pbT"][value="${mdData.ipba}"]`).checked = true;
  document.getElementById('PBInput').value = mdData.ipbainfo || '';

  document.getElementById('mddataEB').value = mdData.mdu || 'currentUser';
}


// function fillBrfForm(brfData) {
//   document.getElementById('brfdataEB').value = brfData.brfu || 'currentUser';
//   document.getElementById('ageAtMenarche').value = brfData.am || '';
//   document.getElementById('parity').value = brfData.pty || '';
//   document.getElementById('numChild').value = brfData.noc || '';
//   document.getElementById('ageAtFirstChild').value = brfData.afc || '';
//   document.querySelector(`input[name="breFd"][value="${brfData.bf}"]`).checked = true;
//   document.getElementById('dbf').value = brfData.dbf || '';
//   document.querySelector(`input[name="mStatus"][value="${brfData.ms}"]`).checked = true;

//   document.getElementById('ad').value = brfData.ad || '';
//   document.querySelector(`input[name="ERRadio"][value="${brfData.er}"]`).checked = true;
//   document.querySelector(`input[name="PRRadio"][value="${brfData.pr}"]`).checked = true;
//   document.querySelector(`input[name="HER2Radio"][value="${brfData.h2}"]`).checked = true;
//   document.getElementById('sbt').value = brfData.sbt || '';
//   document.getElementById('k67').value = brfData.k67 || '';
//   document.getElementById('ClinicalS').value = brfData.cs || '';
//   document.getElementById('HistologicalS').value = brfData.ht || '';
//   document.getElementById('sps').value = brfData.sps || '';
// }

function fillBrfForm(brfData) {
  // Check if brfData.ms exists and has a value
  // if (!brfData.ms) {
  //   console.log("brfData.ms is not provided. Disabling form elements.");

  //   // Get all elements mentioned in the function and disable them
  //   const elementsToDisable = [
  //     'ageAtMenarche',
  //     'parity',
  //     'numChild',
  //     'ageAtFirstChild',
  //     'dbf',
  //     'ad',
  //     'sbt',
  //     'k67',
  //     'ClinicalS',
  //     'HistologicalS',
  //     'sps',
  //     'processedBy',
  //   ];

  //   // Disable input fields
  //   elementsToDisable.forEach(id => {
  //     const element = document.getElementById(id);
  //     if (element) {
  //       element.disabled = true;
  //     }
  //   });

  //   // Disable radio buttons
  //   const radioGroups = ['breFd', 'mStatus', 'ERRadio', 'PRRadio', 'HER2Radio'];
  //   radioGroups.forEach(name => {
  //     const radios = document.querySelectorAll(`input[name="${name}"]`);
  //     radios.forEach(radio => {
  //       radio.disabled = true;
  //     });
  //   });

  //   return; // Exit the function if brfData.ms has no value
  // }

  // Populate data as usual if brfData.ms has a value
  document.getElementById('ageAtMenarche').value = brfData.am || '';
  document.getElementById('parity').value = brfData.pty || '';
  parity();
  document.getElementById('numChild').value = brfData.noc || '';
  document.getElementById('ageAtFirstChild').value = brfData.afc || '';
  if (brfData.bf) {
    document.querySelector(`input[name="breFd"][value="${brfData.bf}"]`).checked = true;
  }
  document.getElementById('dbf').value = brfData.dbf || '';
  if (brfData.ms) {
    document.querySelector(`input[name="mStatus"][value="${brfData.ms}"]`).checked = true;
  }
  // document.getElementById('ad').value = brfData.ad || '';
  if (brfData.er) {
    document.querySelector(`input[name="ERRadio"][value="${brfData.er}"]`).checked = true;
  }
  if (brfData.pr) {
    document.querySelector(`input[name="PRRadio"][value="${brfData.pr}"]`).checked = true;
  }
  if (brfData.h2) {
    document.querySelector(`input[name="HER2Radio"][value="${brfData.h2}"]`).checked = true;
  }
  document.getElementById('sbt').value = brfData.sbt || '';
  document.getElementById('k67').value = brfData.k67 || '';
  // document.getElementById('ClinicalS').value = brfData.cs || '';
  document.getElementById('HistologicalS').value = brfData.ht || '';
  document.getElementById('sps').value = brfData.sps || '';
  document.getElementById('brfdataEB').value = brfData.brfu || 'currentUser';
}



// Define the submitFollowup function
function submitFollowup() {
  event.preventDefault();

  const lastFollowupStatus = document.querySelector('input[name="flexRadioDefault"]:checked').value;
  const lastFollowUpDate = document.getElementById('startInputFollow').value;
  const othrs = document.getElementById('otherR').value;
  const lostToFollowUpReason = document.getElementById('lostFollowUpID') ? document.getElementById('lostFollowUpID').value : '';
  const recurrenceDate = document.getElementById('recurrenceDate') ? document.getElementById('recurrenceDate').value : '';
  const reportedDateForProgressiveDisease = document.getElementById('reportedDate') ? document.getElementById('reportedDate').value : '';
  const vitalStatus = document.querySelector('input[name="livestatus"]:checked').value;
  const deathDate = document.getElementById('deathDate') ? document.getElementById('deathDate').value : '';
  const petremarks = document.getElementById('PET').value;
  const remarks = document.getElementById('remark').value;
  const bioBankId = localStorage.getItem('bioid');
  const timestamp = new Date().getTime();

  const followupData = {
    lfs: lastFollowupStatus,
    othrs: othrs,
    lfd: lastFollowUpDate,
    rlfw: lostToFollowUpReason || '',  // If not provided, set it to an empty string
    rd: recurrenceDate || '',  // If not provided, set it to an empty string
    rdpd: reportedDateForProgressiveDisease || '',  // If not provided, set it to an empty string
    pet: petremarks,
    vs: vitalStatus,
    dd: deathDate || '',  // If not provided, set it to an empty string
    rmks: remarks || '',  // If not provided, set it to an empty string
    fw_ub: user,  // You can dynamically set the field worker's name here
  };

  const db = firebase.database();  // Initialize Firebase database reference
  const dataPath = `Fw/${bioBankId}/${timestamp}`;
  let mode = localStorage.getItem('mode');
  let dus = sessionStorage.getItem('userName');

  let act = {
    "mode": "",
    "user": dus
  };
  let lastSection = localStorage.getItem('lastSection');
  db.ref(`act/${bioBankId}/${lastSection}`).set(act)
    .then(() => {
      console.log("New act set, proceeding with pages_display.");
    })
    .catch((error) => {
      console.error("Error setting new act: ", error);
    });
  // Firebase reference to the path you want to save the data to

  // Push the data to Firebase
  db.ref(dataPath).set(followupData)
    .then(() => {
      switch (mode) {
        case 'SearchView':
          window.location.href = `search.html`;
          break;
        case 'SearchEdit':
          window.location.href = `search.html`;
          break;
        case 'PendingView':
          window.location.href = `todo.html`;
          break;
        case 'PendingEdit':
          window.location.href = `todo.html`;
          break;
        case 'EditFollowUps':
          window.location.href = `todo.html`;
          break;
        case 'ViewFollowUp':
          window.location.href = `todo.html`;
          break;
        case 'undefined':
          window.location.href = `home.html`;
          break;

        default:
          console.error('Unknown mode:', mode);
      }

      console.log('Followup data saved successfully');
    })
    .catch((error) => {
      console.error('Error saving followup data:', error);
      // alert('There was an error saving the follow-up information. Please try again.');
    });

  const timePFW = new Date()
  console.log("time", timePFW)
  // timePFW.setMinutes(timePFW.getMinutes() + 10 * 24 * 60);
  timePFW.setMinutes(timePFW.getMinutes() + 3);

  const selectedStatus = document.querySelector('input[name="livestatus"]:checked').value;
  const lastfollow = document.querySelector('input[name="flexRadioDefault"]:checked').value;

  console.log("selectedStatus", selectedStatus)
  if (selectedStatus === 'Dead' || lastfollow === 'Lost_Follow' || lastfollow === 'death_Dise') {
    // Remove data from the database if Vital Status is Dead
    db.ref(`pfw/${bioBankId}`).remove()
      .then(() => {
        console.log('Data removed from pfw because Vital Status is Dead');
      })
      .catch((error) => {
        console.log('Error removing data from pfw:', error);
      });
  }
  else {
    db.ref(`pfw/${bioBankId}`).set(timePFW.getTime())
      .then(() => {
        console.log('Stored in pfw');
      })
      .catch((error) => {
        console.log('Error storing in pfw:', error);
      });
  }

}


// function updateBB(info, field) {
//   const parts = info.split('/');
//   if (parts.length !== 3) {
//     console.error("Invalid data format. Expected 'box_name/seat_ids/sampleType'.");
//     return;
//   }
//   const bioBankId = document.getElementById('bioBankId').value;

//   const boxName = parts[0].trim();
//   const seatList = parts[1].split(',');
//   const sampleType = parts[2].trim();

//   console.log("bioBankId", bioBankId);
//   if (!bioBankId) {
//     console.error("No bioBankId found in localStorage");
//     return;
//   }

//   const pervInfo= '';
//   let pervInfo = '';
//   const prevSeatList = '';
//   db.ref(`sef/${boxName}`).once('value')
//     .then(snapshot => {
//       let seqData = snapshot.val();
//       if (!seqData) {
//         console.error(`No seqData found for box: ${boxName}`);
//         return;
//       }
//       const timestamps = Object.keys(seqData).map(Number);
//       if (timestamps.length === 0) {
//         console.error("No timestamps found in seqData.");
//         return;
//       }

//       const lastTimestamp = Math.max(...timestamps);
//       const lastData = seqData[lastTimestamp];

//       if (lastData && lastData.ie) {
//         switch (field) {
//           case 'Plasma':
//             pervInfo = lastData.ie.bpg;
//             break;
//           case 'Serum':
//             pervInfo = lastData.ie.bsg;
//             break;
//           case 'Buffy Coat':
//             pervInfo = lastData.ie.bbcg;
//             break;
//           case 'Other':
//             pervInfo = lastData.ie.osg;
//             break;
//           default:
//             console.error("Unknown field:", field);
//         }

//         if (pervInfo !== "") {
//           // Process prevInfo just like info
//           const pervParts = pervInfo.split('/');
//           if (pervParts.length === 3) {
//             prevSeatList = pervParts[1].split(',').map(seat => seat.trim());

//             console.log("Processing prevInfo:", prevBoxName, prevSeatList, prevSampleType);

//             // Mark previous seats as empty if not present in the current seatList
//           } else {
//             console.error("Invalid format in prevInfo. Expected 'box_name/seat_ids/sampleType'.");
//           }
//         }
//       } else {
//         console.error(`${field} value not found in the last timestamp's 'ie' data.`);
//       }
//     })
//     .catch(error => {
//       console.error("Error fetching seqData from Firebase:", error);
//     });


//   db.ref(`bb/${boxName}`).once('value')
//     .then(snapshot => {
//       let box = snapshot.val();

//       if (!box) {
//         console.error(`No box found with the name: ${boxName}`);
//         return;
//       }

//       console.log("seatList", seatList);

//       seatList.forEach(seatID => {
//         seatID = seatID.trim();
//         console.log("seatID", seatID);

//         let seatIndex = getSeatIndex(seatID);

//         if (box[seatIndex]) {
//           const seatUpdate = {
//             bioBankId: bioBankId,
//             sampleType: sampleType,
//             status: "o"
//           };
//           let mode = localStorage.getItem('mode');

//           db.ref(`bb/${boxName}/${seatIndex}`).update(seatUpdate)
//             .then(() => {
//               switch (mode) {
//                 case 'SearchView':
//                   window.location.href = `search.html`;
//                   break;
//                 case 'SearchEdit':
//                   window.location.href = `search.html`;
//                   break;
//                 case 'PendingView':
//                   window.location.href = `todo.html`;
//                   break;
//                 case 'PendingEdit':
//                   window.location.href = `todo.html`;
//                   break;
//                 case 'EditFollowUps':
//                   window.location.href = `todo.html`;
//                   break;
//                 case 'ViewFollowUp':
//                   window.location.href = `todo.html`;
//                   break;
//                 case 'undefined':
//                   window.location.href = `home.html`;
//                   break;

//                 default:
//                   console.error('Unknown mode:', mode);
//               }

//               console.log(`Seat ${seatID} updated successfully in Firebase.`);
//             })
//             .catch(error => {
//               console.error(`Error updating seat ${seatID}:`, error);
//             });
//         }
//       });
//     })
//     .catch(error => {
//       console.error("Error fetching seat data from Firebase:", error);
//     });
// }

function updateBB(info, field) {
  console.log("Plasma info", info)
  const parts = info.split('/');

  const bioBankId = document.getElementById('bioBankId').value;

  const boxName = parts[0].trim();
  const seatList = parts[1].split(',').map(seat => seat.trim());
  const sampleType = parts[2].trim();

  console.log("bioBankId", bioBankId);
  if (!bioBankId) {
    console.error("No bioBankId found in localStorage");
    return;
  }

  console.log("Current seatList", seatList);

  db.ref(`bb/${boxName}`).once('value')
    .then(snapshot => {
      let box = snapshot.val();
      if (!box) {
        console.error(`No box found with the name: ${boxName}`);
        return;
      }

      seatList.forEach(seatID => {
        let seatIndex = getSeatIndex(seatID);
        const seatUpdate = {
          bioBankId: bioBankId,
          sampleType: sampleType,
          status: "o" // Mark as occupied
        };

        db.ref(`bb/${boxName}/${seatIndex}`).update(seatUpdate)
          .then(() => {
            console.log(`Seat ${seatID} updated successfully to "occupied".`);
          })
          .catch(error => {
            console.error(`Error updating seat ${seatID}:`, error);
          });
      });
    })
    .catch(error => {
      console.error("Error fetching seat data from Firebase:", error);
    });
}

function updateRLT(info, field) {
  console.log("RLT info", info)
  const parts = info.split('/');

  const bioBankId = document.getElementById('bioBankId').value;

  const boxName = parts[0].trim();
  const seatList = parts[1].split(',').map(seat => seat.trim());
  const sampleType = parts[2].trim();

  console.log("bioBankId", bioBankId);
  if (!bioBankId) {
    console.error("No bioBankId found in localStorage");
    return;
  }

  console.log("Current seatList", seatList);

  db.ref(`rlt/${boxName}`).once('value')
    .then(snapshot => {
      let box = snapshot.val();
      if (!box) {
        console.error(`No box found with the name: ${boxName}`);
        return;
      }

      seatList.forEach(seatID => {
        let seatIndex = getSeatIndex(seatID);
        const seatUpdate = {
          bioBankId: bioBankId,
          sampleType: sampleType,
          status: "o" // Mark as occupied
        };

        db.ref(`rlt/${boxName}/${seatIndex}`).update(seatUpdate)
          .then(() => {
            console.log(`Seat ${seatID} updated successfully to "occupied".`);
          })
          .catch(error => {
            console.error(`Error updating seat ${seatID}:`, error);
          });
      });
    })
    .catch(error => {
      console.error("Error fetching seat data from Firebase:", error);
    });
}

function updatePC(info, field) {
  console.log("Primary Culture info", info)
  const parts = info.split('/');

  const bioBankId = document.getElementById('bioBankId').value;

  const boxName = parts[0].trim();
  const seatList = parts[1].split(',').map(seat => seat.trim());
  const sampleType = parts[2].trim();

  console.log("bioBankId", bioBankId);
  if (!bioBankId) {
    console.error("No bioBankId found in localStorage");
    return;
  }

  console.log("Current seatList", seatList);

  db.ref(`pcb/${boxName}`).once('value')
    .then(snapshot => {
      let box = snapshot.val();
      if (!box) {
        console.error(`No box found with the name: ${boxName}`);
        return;
      }

      seatList.forEach(seatID => {
        let seatIndex = getSeatIndex(seatID);
        const seatUpdate = {
          bioBankId: bioBankId,
          sampleType: sampleType,
          status: "o" // Mark as occupied
        };

        db.ref(`pcb/${boxName}/${seatIndex}`).update(seatUpdate)
          .then(() => {
            console.log(`Seat ${seatID} updated successfully to "occupied".`);
          })
          .catch(error => {
            console.error(`Error updating seat ${seatID}:`, error);
          });
      });
    })
    .catch(error => {
      console.error("Error fetching seat data from Firebase:", error);
    });
}


// function updateBB(info) {
//   const parts = info.split('/');
//   if (parts.length !== 3) {
//     console.error("Invalid data format. Expected 'box_name/seat_ids/sampleType'.");
//     return;
//   }
//   const bioBankId = document.getElementById('bioBankId').value;

//   const boxName = parts[0].trim();      
//   const seatList = parts[1].split(',');
//   const sampleType = parts[2].trim();

//   console.log("bioBankId",bioBankId)
//   if (!bioBankId) {
//     console.error("No bioBankId found in localStorage");
//     return;
//   }
//   let dbRef = firebase.database().ref('bb');

//     dbRef.once('value')
//     .then(snapshot => {
//       let seatData = snapshot.val();
//       let box = seatData[boxName];

//       if (!box) {
//         console.error(`No box found with the name: ${boxName}`);
//         return;
//       }

//       console.log("seatList", seatList);

//       seatList.forEach(seatID => {
//         seatID = seatID.trim();
//         console.log("seatID", seatID);
//         console.log("sampleType", sampleType);


//         let seatIndex = getSeatIndex(seatID);
//         console.log("seatIndex",seatIndex + " sampleType",sampleType + " seatID",seatID + " boxName",boxName  + " seatList",seatList);

//         if (box[seatIndex]) {
//           box[seatIndex].bioBankId = bioBankId; 
//           box[seatIndex].sampleType = sampleType; 
//           box[seatIndex].status = "o";
//         }
//         console.log("Box Data",box);



//         // db.ref(`bb/${boxName}/${seatIndex}`).set(box)
//         // .then(() => {
//         //   console.log("Seat data updated successfully in Firebase.");
//         // })
//         // .catch(error => {
//         //   console.error("Error updating seat data:", error);
//         // });


//       });
//       const bbVar =  dbRef.ref(`bb/${boxName}/${seatIndex}`);
//         // bbVar.set({
//         //   bioBankId = bioBankId ,
//         //   sampleType = sampleType,
//         //   status = "o"

//         //     });

//     })
//     .catch(error => {
//       console.error("Error fetching seat data from Firebase:", error);
//     });
// }



function getSeatIndex(seatID) {
  const rowLetter = seatID[0];   // e.g., 'B'
  const colNumber = seatID.slice(1);  // e.g., '7'

  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const cols = 10;

  const rowIndex = rows.indexOf(rowLetter);   // Get the index of the row letter
  const colIndex = parseInt(colNumber) - 1;   // Convert column number (1-based) to zero-based index

  return rowIndex * cols + colIndex;   // Calculate the seat's position in the grid
}


function updateSB(info) {

  const parts = info.split('/');
  if (parts.length !== 3) {
    console.error("Invalid data format. Expected 'box_name/seat_ids/sampleType'.");
    return;
  }

  const bioBankId = document.getElementById('bioBankId').value;

  const boxName = parts[0].trim();
  const seatList = parts[1].split(',');
  const sampleTypes = parts[2].split(',');

  console.log("bioBankId", bioBankId);
  if (!bioBankId) {
    console.error("No bioBankId found in localStorage");
    return;
  }

  db.ref(`sb/${boxName}`).once('value')
    .then(snapshot => {
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
            status: "o"
          };

          db.ref(`sb/${boxName}/${seatIndex}`).update(seatUpdate)
            .then(() => {
              console.log(`Seat ${seatID} updated with sample type ${sampleType} successfully in Firebase.`);
            })
            .catch(error => {
              console.error(`Error updating seat ${seatID}:`, error);
            });
        }
      });
    })
    .catch(error => {
      console.error("Error fetching seat data from Firebase:", error);
    });
}



function retrieveFollowup(bioBankId) {
  const db = firebase.database();
  const dataPath = `Fw/${bioBankId}`;
  console.log('Path', dataPath);
  db.ref(dataPath).once('value')
    .then((snapshot) => {
      if (snapshot.exists()) {
        const followupData = snapshot.val();
        console.log('Retrieved follow-up data:', followupData);
        const timestamps = Object.keys(followupData);
        const latestTimestamp = Math.max(...timestamps.map((t) => parseInt(t)));

        const latestData = followupData[latestTimestamp];
        displayFollowupData(latestData);
      }
      else {
        console.log('No follow-up data found for this BioBank ID.');
      }
    })
    .catch((error) => {
      console.error('Error retrieving follow-up data:', error);
      alert('There was an error retrieving the follow-up information. Please try again.');
    });


}

function displayFollowupData(data) {
  // pet: '',  // Assuming you have a field for PET finding that needs to be populated

  console.log('Displaying follow-up data:', data);
  document.querySelector(`input[name="flexRadioDefault"][value="${data.lfs}"]`).checked = true;
  document.getElementById('otherR').value = data.othrs || '';

  document.getElementById('startInputFollow').value = data.lfd || '';
  document.getElementById('lostFollowUp').value = data.rlfw || '';
  document.getElementById('recurrenceDate').value = data.rd || '';
  document.getElementById('reportedDate').value = data.rdpd || '';
  document.getElementById('PET').value = data.pet || '';

  document.querySelector(`input[name="livestatus"][value="${data.vs}"]`).checked = true;
  document.getElementById('deathDate').value = data.dd || '';
  document.getElementById('remark').value = data.rmks || '';
  $(document).ready(function () {
    function toggleFollowup() {
      if ($('#radioOther').is(':checked')) {
        $('#otherText').show();
      }
      else {
        $('#otherText').hide();
      }
      if ($('#radioRecurrence').is(':checked')) {
        $('#recurID').show();
      }
      else {
        $('#recurID').hide();
      }
      if ($('#radioLost').is(':checked')) {
        $('#lostFollowUpID').show();
      }
      else {
        $('#lostFollowUpID').hide();
      }
      if ($('#radioDiseasePro').is(':checked')) {
        $('#proDisID').show();
        $('#pmr').show();
      }
      else {
        $('#proDisID').hide();
        $('#pmr').hide();

      }
    }
    toggleFollowup();
    $('input[name="flexRadioDefault"]').change(function () {
      toggleFollowup();
    });
  });
}


function shareData(mode, selectedPatients) {
  // Convert the selectedPatients array into a JSON string before storing
  localStorage.setItem('selectedPatients', JSON.stringify(selectedPatients));
  localStorage.setItem('mode', mode);
  console.log("Selected patients for sharing:", selectedPatients);

  switch (mode) {
    case 'share':
      localStorage.setItem("selectedGrid", "");
      window.location.href = `default.html?shared=true`;
      break;
    default:
      console.error('Unknown mode:', mode);
  }
}


function popSharedmodal(bioboxName, samples) {
  // Fetch box ID from the "bn" node
  function fetchBoxIdFromBN(boxName) {
    return new Promise((resolve, reject) => {
      let dbRef = firebase.database().ref('bn');
      dbRef.once('value')
        .then(snapshot => {
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
        .catch(error => {
          console.error("Error fetching 'bn' data:", error);
          reject(error);
        });
    });
  }

  // Fetch seat data from "bb" or "sb" node using box ID
  function fetchSeatDataFromDB(nodeName, boxId) {
    return new Promise((resolve, reject) => {
      let dbRef = firebase.database().ref(`${nodeName}/${boxId}`);
      dbRef.once('value')
        .then(snapshot => {
          let seatData = snapshot.val();
          resolve(seatData);
        })
        .catch(error => {
          console.error(`Error fetching seat data from '${nodeName}':`, error);
          reject(error);
        });
    });
  }

  // Main logic
  console.log("bioboxName", bioboxName);

  fetchBoxIdFromBN(bioboxName)
    .then(boxId => {
      if (!boxId) {
        console.log(`No box ID found for ${bioboxName}.`);
        return; // Exit if no box ID is found
      }

      // Fetch seat data from "bb"
      fetchSeatDataFromDB('bb', boxId)
        .then(bbData => {
          if (bbData) {
            console.log(`Box ID ${boxId} for '${bioboxName}' found in 'bb'.`);
            popSharedBloodmodal(bioboxName, samples);
          } else {
            console.log(`Box ID ${boxId} not found in 'bb'.`);
          }
        })
        .catch(error => {
          console.error("Error fetching 'bb' data:", error);
        });

      // Fetch seat data from "sb"
      fetchSeatDataFromDB('sb', boxId)
        .then(sbData => {
          if (sbData) {
            console.log(`Box ID ${boxId} for '${bioboxName}' found in 'sb'.`);
            popSharedSpecimenmodal(bioboxName, samples);
          } else {
            console.log(`Box ID ${boxId} not found in 'sb'.`);
          }
        })
        .catch(error => {
          console.error("Error fetching 'sb' data:", error);
        });

      fetchSeatDataFromDB('rlt', boxId)
        .then(bbData => {
          if (bbData) {
            console.log(`Box ID ${boxId} for '${bioboxName}' found in 'bb'.`);
            popSharedRLTmodal(bioboxName, samples);
          } else {
            console.log(`Box ID ${boxId} not found in 'bb'.`);
          }
        })
        .catch(error => {
          console.error("Error fetching 'bb' data:", error);
        });

      fetchSeatDataFromDB('pcb', boxId)
        .then(bbData => {
          if (bbData) {
            console.log(`Box ID ${boxId} for '${bioboxName}' found in 'bb'.`);
            popSharedPCmodal(bioboxName, samples);
          } else {
            console.log(`Box ID ${boxId} not found in 'bb'.`);
          }
        })
        .catch(error => {
          console.error("Error fetching 'bb' data:", error);
        });

    })
    .catch(error => {
      console.error("Error fetching box ID from 'bn':", error);
    });
}



// function popSharedBloodmodal(bioboxName) {
//   $('#bloodModalCenter').modal('show');

//   fetchSeatDataFromDB('bb').then(seatData => {
//     populateBSeats('blood-box', seatData);
//   });

//   function fetchSeatDataFromDB(nodeName) {
//     return new Promise((resolve, reject) => {
//       let dbRef = firebase.database().ref(nodeName);
//       dbRef.once('value')
//         .then(snapshot => {
//           let seatData = snapshot.val();
//           resolve(seatData);
//         })
//         .catch(error => {
//           console.error("Error fetching seat data:", error);
//           reject(error);
//         });
//     });
//   }

//   function populateBSeats(containerClass, seatData) {
//     let container = document.querySelector(`.${containerClass}`);
//     container.innerHTML = '';

//     const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
//     const cols = 10;
//     const activeBoxEntry = Object.entries(seatData).find(([boxName, data]) => boxName === bioboxName);

//     if (!activeBoxEntry) {
//       console.error("No active box found with status 'AC'.");
//       return;
//     }

//     grid = localStorage.getItem("selectedGrid");
//     console.log("selected Grid Data:", grid);

//     const [activeBoxName, filteredSeats] = activeBoxEntry;
//     console.log("Active Box Name:", activeBoxName);

//     document.getElementById('currBloodBoxName').textContent = activeBoxName;


//     const indexedSeats = filteredSeats;
//     if (!indexedSeats) {
//       console.log("No indexed seats available in the active box.");
//       return;
//     }


//     for (let row = 0; row < rows.length; row++) {
//       for (let col = 1; col <= cols; col++) {
//         const labelName = `label_B${rows[row]}${col}`;
//         const seatID = `${rows[row]}${col}`;
//         const index = row * cols + (col - 1);


//         const seat = indexedSeats[index];

//         if (seat) {
//           container.insertAdjacentHTML(
//             "beforeend",
//             `<input type="checkbox" name="seats" id="${seatID}" />` +
//             `<label for="${seatID}" class="seat" id="${labelName}">${labelName}</label>`
//           );

//           let labelElement = document.getElementById(labelName);
//           if (labelElement) {
//             labelElement.innerHTML = `${seat.bioBankId || ""}<br>${seat.sampleType || ''}`;
//             labelElement.style.fontWeight = "bold";
//             labelElement.style.fontSize = "9px";
//             labelElement.style.textAlign = 'center';
//             labelElement.style.color = 'white';

//             if (seat.status === "o" || (seatID.includes(grid))) {
//               labelElement.style.background = "rgb(129, 129, 192)";
//             } else if (seat.status === "s") {
//               labelElement.style.background = "rgb(180, 180, 180)";
//             } else if (seat.status === "ps") {
//               labelElement.style.background = "rgb(193, 154, 107)";
//             } else if (seat.status === "e") {
//               labelElement.style.background = "rgb(143, 218, 187)";
//             }
//           }
//         }
//       }
//       container.insertAdjacentHTML("beforeend", "<br/>");
//     }


//   }
// }


function popSharedBloodmodal(bioboxName, samples) {
  $('#sharedBloodModal').modal('show');

  fetchSeatDataFromDB('bb').then(seatData => {
    populateBSeats('shared-box', seatData);
  });

  function fetchSeatDataFromDB(nodeName) {
    return new Promise((resolve, reject) => {
      let dbRef = firebase.database().ref(nodeName);
      dbRef.once('value')
        .then(snapshot => {
          let seatData = snapshot.val();
          resolve(seatData);
        })
        .catch(error => {
          console.error("Error fetching seat data:", error);
          reject(error);
        });
    });
  }

  function populateBSeats(containerClass, seatData) {
    let container = document.querySelector(`.${containerClass}`);
    container.innerHTML = '';

    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const cols = 10;

    let gridSamples = [];
    gridSamples = samples.split(',');
    let activeBoxEntry = [];
    let box_id = [];
    db.ref('bn/').once('value')
      .then((snapshot) => {
        if (snapshot.exists()) {
          const boxIDs = snapshot.val();

          bioInfo = Object.entries(boxIDs).find(([bio_id, boxData]) => bio_id === bioboxName);
          const [id, boxData] = bioInfo;

          box_id = id;
          console.log("bioinfo", bioInfo)
          console.log("box_id", box_id)


          // console.log("box name", boxname);
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

          db.ref('bn/' + boxid).once('value')
            .then((snapshot) => {
              if (snapshot.exists()) {
                boxName = snapshot.val();

                console.log("Box Name for ID " + boxid + ": " + boxName);
                document.getElementById('cursharedBloodBox').textContent = boxName;

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
                      `<input type="checkbox" name="seats" id="${seatID}" />` +
                      `<label for="${seatID}" class="viewSeat" id="${labelName}">${labelName}</label>`
                    );

                    let labelElement = document.getElementById(labelName);
                    if (labelElement) {
                      if (seat.bioBankId !== '') {
                        labelElement.innerHTML = `${seat.bioBankId || ''}<br>${seat.sampleType || ''}`;
                        labelElement.style.fontWeight = "bolder";
                        labelElement.style.fontSize = "9px";
                        labelElement.style.textAlign = "center";
                        labelElement.style.color = 'white';
                      } else if (seat.bioBankId === '') {
                        labelElement.innerHTML = `${'-'}<br>`;
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
                      }

                      if (gridSamples.includes(seatID)) {
                        labelElement.style.background = "#4d6335";
                        console.log("seatID in sahred Box", gridSamples)

                        console.log("seatID in sahred Box", seatID)
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

          // document.getElementById('currBloodBoxName').textContent = activeBoxName;

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
  $('#sharedSpecimenModal').modal('show');

  fetchSeatDataFromDB('sb').then(seatData => {
    populateSSeats('shared-s-box', seatData);
  });

  function fetchSeatDataFromDB(nodeName) {
    return new Promise((resolve, reject) => {
      let dbRef = firebase.database().ref(nodeName);
      dbRef.once('value')
        .then(snapshot => {
          let seatData = snapshot.val();
          resolve(seatData);
        })
        .catch(error => {
          console.error("Error fetching seat data:", error);
          reject(error);
        });
    });
  }

  function populateSSeats(containerClass, seatData) {
    let container = document.querySelector(`.${containerClass}`);
    container.innerHTML = '';

    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const cols = 10;

    const gridSamples = samples;

    let activeBoxEntry = [];
    let box_id = [];
    db.ref('bn/').once('value')
      .then((snapshot) => {
        if (snapshot.exists()) {
          const boxIDs = snapshot.val();

          bioInfo = Object.entries(boxIDs).find(([bio_id, boxData]) => bio_id === bioboxName);
          const [id, boxData] = bioInfo;
          box_id = id;
          console.log("bioinfo", bioInfo)
          console.log("box_id", box_id)


          // console.log("box name", boxname);
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

          db.ref('bn/' + boxid).once('value')
            .then((snapshot) => {
              if (snapshot.exists()) {
                boxName = snapshot.val();

                console.log("Box Name for ID " + boxid + ": " + boxName);
                document.getElementById('cursharedSpecimenBox').textContent = boxName;

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
                      `<input type="checkbox" name="seats" id="${seatID}" />` +
                      `<label for="${seatID}" class="viewSeat" id="${labelName}">${labelName}</label>`
                    );

                    let labelElement = document.getElementById(labelName);
                    if (labelElement) {
                      if (seat.bioBankId !== '') {
                        labelElement.innerHTML = `${seat.bioBankId || ''}<br>${seat.sampleType || ''}`;
                        labelElement.style.fontWeight = "bolder";
                        labelElement.style.fontSize = "9px";
                        labelElement.style.textAlign = "center";
                        labelElement.style.color = 'white';
                      } else if (seat.bioBankId === '') {
                        labelElement.innerHTML = `${'-'}<br>`;
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

          // document.getElementById('currBloodBoxName').textContent = activeBoxName;

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
  $('#sharedRLTModal').modal('show');

  fetchSeatDataFromDB('rlt').then(seatData => {
    populateBSeats('shared-r-box', seatData);
  });

  function fetchSeatDataFromDB(nodeName) {
    return new Promise((resolve, reject) => {
      let dbRef = firebase.database().ref(nodeName);
      dbRef.once('value')
        .then(snapshot => {
          let seatData = snapshot.val();
          resolve(seatData);
        })
        .catch(error => {
          console.error("Error fetching seat data:", error);
          reject(error);
        });
    });
  }

  function populateBSeats(containerClass, seatData) {
    let container = document.querySelector(`.${containerClass}`);
    container.innerHTML = '';

    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const cols = 10;

    let gridSamples = [];
    gridSamples = samples.split(',');
    let activeBoxEntry = [];
    let box_id = [];
    db.ref('bn/').once('value')
      .then((snapshot) => {
        if (snapshot.exists()) {
          const boxIDs = snapshot.val();

          bioInfo = Object.entries(boxIDs).find(([bio_id, boxData]) => bio_id === bioboxName);
          const [id, boxData] = bioInfo;

          box_id = id;
          console.log("bioinfo", bioInfo)
          console.log("box_id", box_id)


          // console.log("box name", boxname);
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

          db.ref('bn/' + boxid).once('value')
            .then((snapshot) => {
              if (snapshot.exists()) {
                boxName = snapshot.val();

                console.log("Box Name for ID " + boxid + ": " + boxName);
                document.getElementById('cursharedRLTBox').textContent = boxName;

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
                      `<input type="checkbox" name="seats" id="${seatID}" />` +
                      `<label for="${seatID}" class="viewSeat" id="${labelName}">${labelName}</label>`
                    );

                    let labelElement = document.getElementById(labelName);
                    if (labelElement) {
                      if (seat.bioBankId !== '') {
                        labelElement.innerHTML = `${seat.bioBankId || ''}<br>${seat.sampleType || ''}`;
                        labelElement.style.fontWeight = "bolder";
                        labelElement.style.fontSize = "9px";
                        labelElement.style.textAlign = "center";
                        labelElement.style.color = 'white';
                      } else if (seat.bioBankId === '') {
                        labelElement.innerHTML = `${'-'}<br>`;
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
                      }

                      if (gridSamples.includes(seatID)) {
                        labelElement.style.background = "#4d6335";
                        console.log("seatID in sahred Box", gridSamples)

                        console.log("seatID in sahred Box", seatID)
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

          // document.getElementById('currBloodBoxName').textContent = activeBoxName;

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
  $('#sharedPCModal').modal('show');

  fetchSeatDataFromDB('pcb').then(seatData => {
    populateBSeats('shared-p-box', seatData);
  });

  function fetchSeatDataFromDB(nodeName) {
    return new Promise((resolve, reject) => {
      let dbRef = firebase.database().ref(nodeName);
      dbRef.once('value')
        .then(snapshot => {
          let seatData = snapshot.val();
          resolve(seatData);
        })
        .catch(error => {
          console.error("Error fetching seat data:", error);
          reject(error);
        });
    });
  }

  function populateBSeats(containerClass, seatData) {
    let container = document.querySelector(`.${containerClass}`);
    container.innerHTML = '';

    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const cols = 10;

    let gridSamples = [];
    gridSamples = samples.split(',');
    let activeBoxEntry = [];
    let box_id = [];
    db.ref('bn/').once('value')
      .then((snapshot) => {
        if (snapshot.exists()) {
          const boxIDs = snapshot.val();

          bioInfo = Object.entries(boxIDs).find(([bio_id, boxData]) => bio_id === bioboxName);
          const [id, boxData] = bioInfo;

          box_id = id;
          console.log("bioinfo", bioInfo)
          console.log("box_id", box_id)


          // console.log("box name", boxname);
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

          db.ref('bn/' + boxid).once('value')
            .then((snapshot) => {
              if (snapshot.exists()) {
                boxName = snapshot.val();

                console.log("Box Name for ID " + boxid + ": " + boxName);
                document.getElementById('cursharedPCBox').textContent = boxName;

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
                      `<input type="checkbox" name="seats" id="${seatID}" />` +
                      `<label for="${seatID}" class="viewSeat" id="${labelName}">${labelName}</label>`
                    );

                    let labelElement = document.getElementById(labelName);
                    if (labelElement) {
                      if (seat.bioBankId !== '') {
                        labelElement.innerHTML = `${seat.bioBankId || ''}<br>${seat.sampleType || ''}`;
                        labelElement.style.fontWeight = "bolder";
                        labelElement.style.fontSize = "9px";
                        labelElement.style.textAlign = "center";
                        labelElement.style.color = 'white';
                      } else if (seat.bioBankId === '') {
                        labelElement.innerHTML = `${'-'}<br>`;
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
                      }

                      if (gridSamples.includes(seatID)) {
                        labelElement.style.background = "#4d6335";
                        console.log("seatID in sahred Box", gridSamples)

                        console.log("seatID in sahred Box", seatID)
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

          // document.getElementById('currBloodBoxName').textContent = activeBoxName;

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
  db.ref(`Os/${bioBankId}`).once('value')
    .then((snapshot) => {
      if (snapshot.exists()) {
        const outSourceData = snapshot.val();
        console.log('Retrieved OutSource data:', outSourceData);

        // Clear any existing card bodies before populating new ones
        const container = document.querySelector('.card-container');
        container.innerHTML = '';

        // Loop through the sequence numbers in the data
        Object.keys(outSourceData).forEach(seqNum => {
          const seqData = outSourceData[seqNum];
          console.log("seqnum", seqData);

          // Extract timestamps from the sequence data
          const timestamps = Object.keys(seqData);
          console.log('Timestamps:', timestamps);

          // Populate a new card for each timestamp
          timestamps.forEach(timestamp => {
            // Convert the timestamp to IST
            const date = new Date(timestamp * 1000); // Multiply by 1000 if timestamp is in seconds
            const istTimestamp = date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });


            const cardTemplate = `
              <div class="card-body row" style="justify-content: space-around;">
                <h5 class="card-title">${bioBankId}</h5>
                <p class="card-text">${istTimestamp}</p>
                <a href="#" class="btn btn-primary" onclick="viewShared('${bioBankId}', ${timestamp})">View</a>
              </div>
            `;

            // Insert the cloned card into the container
            container.insertAdjacentHTML('beforeend', cardTemplate);
          });
        });
      } else {
        console.log('No OutSource data found for this BioBank ID.');
        const container = document.querySelector('.card-container');
        container.innerHTML = '<p>No OutSource data available.</p>';
      }
    })
    .catch((error) => {
      console.error('Error retrieving OutSource data:', error);
      alert('There was an error retrieving the OutSource information. Please try again.');
    });
}

// Define the viewShared function globally
function viewShared(bioBankId, timestamp) {
  // Hide sharedCard and display shareForm when the viewShared button is clicked
  document.getElementById('sharedCard').style.display = 'none';
  document.getElementById('shareForm').style.display = 'block';

  db.ref(`Os/${bioBankId}`).once('value')
    .then((snapshot) => {
      if (snapshot.exists()) {
        const outSourceData = snapshot.val();
        console.log('Retrieved OutSource data:', outSourceData);

        Object.keys(outSourceData).forEach(seqNum => {
          const seqData = outSourceData[seqNum];
          console.log("seqnum", seqData);

          const latestData = seqData[timestamp];
          console.log("latestData", latestData);

          displayOutsourceData(latestData); // Call your custom function to display data
        });
      } else {
        console.log('No OutSource data found for this BioBank ID.');
      }
    })
    .catch((error) => {
      console.error('Error retrieving OutSource data:', error);
      alert('There was an error retrieving the OutSource information. Please try again.');
    });
}


function shared_pages_display(mode, bioBankId, seq, boxName, timestampKey) {
  console.log("mode", mode);
  console.log("bioBankId", bioBankId);
  console.log("seq", seq);
  console.log("timestampKey", timestampKey);
  console.log("boxName", boxName)
  localStorage.setItem("sharedBox", boxName);

  var dataPath = `Os/${bioBankId}/${seq}/`;

  console.log("datapath", dataPath);
  console.log("DataConfig", db);

  localStorage.setItem('bioid', bioBankId);
  localStorage.setItem('mode', mode);


  if (mode != "") {
    console.log('dataPath', dataPath);
    db.ref(dataPath).once('value')
      .then(snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          console.log("Fetched data:", data);
          sessionStorage.setItem('sharedData', JSON.stringify(data));
          const storedData = sessionStorage.getItem('sharedData');
          if (storedData) {
            const parsedData = JSON.parse(storedData);
            console.log('parsedData', parsedData);
          } else {
            console.log('No formData found in sessionStorage');
          }
          switch (mode) {
            case 'sharedView':
              localStorage.setItem("selectedGrid", "");
              window.location.href = `default.html?shared=true`;
              break;

            default:
              console.error('Unknown mode:', mode);
          }
        } else {
          console.error('No data found at the specified path');
        }
      }).catch(error => {
        console.error("Error fetching data:", error);
      });
  }
  else if (mode === "") {
    localStorage.setItem("selectedGrid", "");
    window.location.href = "default.html";
  }
  else if (mode === undefined) {
    const formElements = [
      ...document.querySelectorAll('input, select, textarea'),
    ];

    // if (!mdData.pst) {
    //   // Disable all elements
    //   formElements.forEach((element) => {
    //     element.disabled = true;
    //   });

    //   return; // Exit the function if `pst` is not available
    // }

  }
}

function displayOutsourceData(data) {
  console.log('Displaying Outsource data:', data);

  // Set form inputs based on retrieved data
  document.querySelector(`input[name="sharestatus"][value="${data.ossts}"]`).checked = true;
  document.getElementById('startInputOutsource').value = data.doe || '';
  document.getElementById('institute').value = data.dpt || '';
  document.getElementById('projectName').value = data.prj || '';
  document.getElementById('nopi').value = data.pip || '';  // Assuming 'pip' is project leader info
  document.getElementById('parSharedRemark').value = data.psr || '';

  // Handle dynamic child nodes inside 'lbi'
  const sharedSampleBox = document.getElementById('sharedSampleBox');
  sharedSampleBox.style.display = 'block'; // Make sure it's visible
  sharedSampleBox.innerHTML = ''; // Clear previous content

  if (data.lbi) {
    Object.keys(data.lbi).forEach(childNode => {
      const childData = data.lbi[childNode];

      if (childData) {
        // Format the child node data if it's an array
        const formattedSamples = childData;
        const childContent = `${childNode}: ${formattedSamples}`;
        const storedBnData = JSON.parse(localStorage.getItem('bnData'));

        // Find the box entry based on the box name
        const boxEntry = storedBnData.find(entry => entry.id === childNode);
        const Boxname = boxEntry.name;


        // Dynamically create a button for each box
        const sampleButton = `
          <div class="row ml-1 mb-3">
            <label for="sharedSampleBox" class="col-sm-2 mb-1 col-form-label">${Boxname} Grid No.</label>
            <div class="col-sm-10 mt-2">
              <input type="button" class="form-control" value="${formattedSamples}" onclick="popSharedmodal('${childNode}', '${formattedSamples}')">
            </div>
          </div>
        `;

        // Insert the button into the sharedSampleBox
        sharedSampleBox.insertAdjacentHTML('beforeend', sampleButton);
      } else {
        // If the child node is not an array, handle it appropriately
        sharedSampleBox.insertAdjacentHTML('beforeend', `<p>${childNode}: ${childData}</p>`);
      }
    });
  }

  else {
    sharedSampleBox.innerHTML = 'No samples available.';
  }
  console.log("Bhanu", document.querySelector('#radioPartial').checked)

  if (document.querySelector('#radioPartial').checked) {
    document.querySelector('#partialSamples').style.display = 'block';
  }
}



function goToTimestampCard() {
  document.getElementById('shareForm').style.display = 'none';

  document.getElementById('sharedCard').style.display = 'block';
}
let bnLocalS = [];

function fetchBnData() {
  let bnLocalS = [];

  db.ref('bn/').once('value')
    .then((snapshot) => {
      if (snapshot.exists()) {
        const boxIDs = snapshot.val();
        console.log("Bio Box Names in the BN node", boxIDs);

        let bnLocalS = [];

        for (const [key, value] of Object.entries(boxIDs)) {
          bnLocalS.push({ id: key, name: value });
        }
        // bnLocalS = boxIDs;
        localStorage.setItem('bnData', JSON.stringify(bnLocalS));

        console.log("Data stored in bnLocalS:", bnLocalS);
        console.log("Data stored in local storage.");
      }
    })
    .catch((error) => {
      console.error('Error fetching data:', error);
    });
}


// Function to show the loading modal
function showLoadingModal() {
  document.getElementById('loading').style.display = 'flex';
  setTimeout(hideLoadingModal, 1000); // 3000 ms = 3 seconds
}

// Function to hide the loading modal
function hideLoadingModal() {
  document.getElementById('loading').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function () {


  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach(link => {
    link.addEventListener('click', function (event) {
      event.preventDefault(); // Prevent default navigation

      const href = this.getAttribute('href'); // Store the link
      showLoadingModal(); // Show spinner modal and hide after 3 seconds

      setTimeout(() => {
        window.location.href = href; // Redirect after 3 seconds
      }, 1000);
    });
  });


});

function searchLoadingModal() {
  document.getElementById('loading').style.display = 'flex';
}



function bloodSample() {
  console.log("bloodSample", ($('#bloodSampleY').is(':checked')))
  if ($('#bloodSampleY').is(':checked')) {
    $('#plasmatubes').show();
    $('#serumtubes').show();
    $('#bufferCoatTubes').show();
  }
  else if ($('#bloodSampleN').is(':checked')) {
    $('#plasmatubes').hide();
    $('#serumtubes').hide();
    $('#bufferCoatTubes').hide();
    $('#PlasmagridNo').val('');
    $('#SerumgridNo').val('')
    $('#bufferCoatgridNo').val('')
    // localStorage.removeItem("LocalPlasma");
    // localStorage.removeItem("LocalSerum");
    // localStorage.removeItem("LocalBuffy");
    // localStorage.removeItem("LocalOther");  
  }
}
function specimenSample() {
  if ($('#specimenSampleY').is(':checked')) {
    $('#countFttubes').show();
    $('#fttubes').show();
    $('#countFntubes').show();
    $('#fntubes').show();
  }
  else if ($('#specimenSampleN').is(':checked')) {
    $('#countFttubes').hide();
    $('#fttubes').hide();
    $('#countFntubes').hide();
    $('#fntubes').hide();
    $('#ftgrid').val('');
    $('#fngrid').val('');
    $('#ft_tubes').val('');
    $('#fn_tubes').val('');
  }
}
function otherSample() {
  if ($('#otherSampleY').is(':checked')) {
    $('#oSampleTubes').show();
    $('#oSampleDesc').show();
  }
  else if ($('#otherSampleN').is(':checked')) {
    $('#oSampleTubes').hide();
    $('#oSampleDesc').hide();
    $('#OSgridNo').val('');
    $('#otSampleDesc').val('');
    // localStorage.removeItem("LocalOther");
  }
}

function rltSample() {
  if ($('#rltSampleY').is(':checked')) {
    $('#rltSampleTubes').show();
  }
  else if ($('#rltSampleN').is(':checked')) {
    $('#rltSampleTubes').hide();
    $('#rltSgridNo').val('');
    localStorage.removeItem("LocalRltGrid");
    localStorage.removeItem("rltSelectedGrid");

    // let rltGrids = localStorage.getItem("LocalRltGrid");

    // if (rltGrids !== null) {
    //   let mainGrids = localStorage.getItem("selectedRltGrid");
    //   let rltMainGridsArray = mainGrids.split(',');
    //   let rltGridsArray = rltGrids.split(',');

    //   rltMainGridsArray = rltMainGridsArray.filter(grid => !rltGridsArray.includes(grid));

    //   localStorage.setItem("selectedRltGrid", rltMainGridsArray.join(','));
    //   localStorage.removeItem("LocalRltGrid");

    // }
  }
}

rltSample();
$('input[name="rltSample"]').change(function () {
  rltSample();
});

function pcbSample() {
  if ($('#pcbSampleY').is(':checked')) {
    $('#pcbSampleTubes').show();
  }
  else if ($('#pcbSampleN').is(':checked')) {
    $('#pcbSampleTubes').hide();
    $('#pcSgridNo').val('');
    localStorage.removeItem("LocalPC");
    localStorage.removeItem("pcSelectedGrid");


    // let pcbGrids = localStorage.getItem("LocalPcbGrid");

    // if (pcbGrids !== null) {
    //   let mainGrids = localStorage.getItem("selectedPcbGrid");
    //   let pcbMainGridsArray = mainGrids.split(',');
    //   let pcbGridsArray = pcbGrids.split(',');

    //   pcbMainGridsArray = pcbMainGridsArray.filter(grid => !pcbGridsArray.includes(grid));

    //   localStorage.setItem("selectedPcbGrid", pcbMainGridsArray.join(','));
    //   localStorage.removeItem("LocalPcbGrid");
    // }
  }
}

pcbSample();
$('input[name="pcbSample"]').change(function () {
  pcbSample();
});


function sampleReceive() {
  console.log("Function checking", $('#radioprocessed1').is(':checked'), $('#radioprocessed2').is(':checked'))
  if ($('#radioprocessed1').is(':checked')) {
    $('#receiveAllSample').show();
    $('#processAllSample').show();
    $('#AllSamplesProcess').show();
    $('#BprocessedBy').val('');
    $('#bloodSampleReceivedDate').val('');
    $('#bloodSampleReceivedTime').val('');
    $('#bloodSampleProcessedDate').val('');
    $('#bloodSampleProcessedTime').val('');
    $('#SprocessedBy').val('');
    $('#SpecimenSampleReceivedDate').val('');
    $('#SpecimenSampleReceivedTime').val('');
    $('#SpecimenSampleProcessedDate').val('');
    $('#SpecimenSampleProcessedTime').val('');
    $('#OprocessedBy').val('');
    $('#OtherSampleReceivedDate').val('');
    $('#OtherSampleReceivedTime').val('');
    $('#OtherSampleProcessedDate').val('');
    $('#OtherSampleProcessedTime').val('');
    $('#RLTprocessedBy').val('');
    $('#RLTSampleReceivedDate').val('');
    $('#RLTSampleReceivedTime').val('');
    $('#RLTSampleProcessedDate').val('');
    $('#RLTSampleProcessedTime').val('');
    $('#PCprocessedBy').val('');
    $('#PCSampleReceivedDate').val('');
    $('#PCSampleReceivedTime').val('');
    $('#PCSampleProcessedDate').val('');
    $('#PCSampleProcessedTime').val('');

  }
  else if ($('#radioprocessed2').is(':checked')) {
    $('#receiveAllSample').hide();
    $('#processAllSample').hide();
    $('#AllSamplesProcess').hide();
    $('#processedBy').val('');
    $('#sampleReceivedDate').val('');
    $('#sampleReceivedTime').val('');
    $('#sampleProcessedDate').val('');
    $('#sampleProcessedTime').val('');
  }
  else if (!($('#radioprocessed1').is(':checked')) && !($('#radioprocessed2').is(':checked'))) {
    $('#receiveAllSample').hide();
    $('#processAllSample').hide();
    $('#AllSamplesProcess').hide();
    $('#processedBy').val('');
    $('#sampleReceivedDate').val('');
    $('#sampleReceivedTime').val('');
    $('#sampleProcessedDate').val('');
    $('#sampleProcessedTime').val('');
    $('#BprocessedBy').val('');
    $('#bloodSampleReceivedDate').val('');
    $('#bloodSampleReceivedTime').val('');
    $('#bloodSampleProcessedDate').val('');
    $('#bloodSampleProcessedTime').val('');
    $('#SprocessedBy').val('');
    $('#SpecimenSampleReceivedDate').val('');
    $('#SpecimenSampleReceivedTime').val('');
    $('#SpecimenSampleProcessedDate').val('');
    $('#SpecimenSampleProcessedTime').val('');
    $('#OprocessedBy').val('');
    $('#OtherSampleReceivedDate').val('');
    $('#OtherSampleReceivedTime').val('');
    $('#OtherSampleProcessedDate').val('');
    $('#OtherSampleProcessedTime').val('');
  }
  if (($('#radioprocessed2').is(':checked')) && ($('#bloodSampleY').is(':checked'))) {
    $('#receiveBloodSample').show();
    $('#processBloodSample').show();
    $('#BloodSamplesProcess').show();
  }
  else {
    $('#receiveBloodSample').hide();
    $('#processBloodSample').hide();
    $('#BloodSamplesProcess').hide();

  }
  if (($('#radioprocessed2').is(':checked')) && ($('#specimenSampleY').is(':checked'))) {
    $('#receiveSpecimenSample').show();
    $('#processSpecimenSample').show();
    $('#SpecimenSamplesProcess').show();
  }
  else {
    $('#receiveSpecimenSample').hide();
    $('#processSpecimenSample').hide();
    $('#SpecimenSamplesProcess').hide();

  }
  if (($('#radioprocessed2').is(':checked')) && ($('#otherSampleY').is(':checked'))) {
    $('#receiveOtherSample').show();
    $('#processOtherSample').show();
    $('#OtherSamplesProcess').show();
  }
  else {
    $('#receiveOtherSample').hide();
    $('#processOtherSample').hide();
    $('#OtherSamplesProcess').hide();
  }
  if (($('#radioprocessed2').is(':checked')) && ($('#rltSampleY').is(':checked'))) {
    $('#receiveRLTSample').show();
    $('#processRLTSample').show();
    $('#RLTSamplesProcess').show();
  }
  else {
    $('#receiveRLTSample').hide();
    $('#processRLTSample').hide();
    $('#RLTSamplesProcess').hide();
  }
  if (($('#radioprocessed2').is(':checked')) && ($('#pcbSampleY').is(':checked'))) {
    $('#receivePCSample').show();
    $('#processPCSample').show();
    $('#PCSamplesProcess').show();
  }
  else {
    $('#receivePCSample').hide();
    $('#processPCSample').hide();
    $('#PCSamplesProcess').hide();
  }
}




function familyHabitToggle() {
  if ($('#familyHistoryCancer1').is(':checked')) {
    $('#relation_Cancer').show();
  }
  else {
    $('#relation_Cancer').hide();
    $('#familyRelation').val('');
    $('#familyCancerType').val('');
  }
}

function ExistComorbidity() {
  if ($('#ECH1').is(':checked')) {
    $('#medications').show();
  }
  else {
    $('#medications').hide();
    $('#comorbidityMedications').val('');
  }
}

function IHCMarker() {
  if ($('#IHC_yes').is(':checked')) {
    $('#ihcDescr').show();
  }
  else {
    $('#ihcDescr').hide();
    $('#IHC_Description').val('');
  }
}

function GeneticT() {
  if ($('#gt_yes').is(':checked')) {
    $('#dt_Desc').show();
  }
  else {
    $('#dt_Desc').hide();
    $('#GT_Description').val('');
  }
}

function NactYes() {
  if ($('#NACTYes').is(':checked')) {
    $('#nactDC').show();
    $('#nactDLC').show();
  }
  else {
    $('#nactDC').hide();
    $('#nactDLC').hide();
    $('#NACT_cycle').val('');
    $('#NACT_cycle_D').val('');
  }
}

function actYes() {
  if ($('#ACTYes').is(':checked')) {
    $('#actDC').show();
    $('#actDLC').show();
  }
  else {
    $('#actDC').hide();
    $('#actDLC').hide();
    $('#actDrugCycles').val('');
    $('#actDateLastCycle').val('');
  }
}

function RadioTYes() {
  if ($('#RTYes').is(':checked')) {
    $('#rtDC').show();
    $('#rtDLC').show();
  }
  else {
    $('#rtDC').hide();
    $('#rtDLC').hide();
    $('#radiotherapyDetails').val('');
    $('#radiotherapyLastCycleDate').val('');
  }
}

function parity() {
  let parityValue = parseInt($('#parity').val(), 10);

  if (parityValue > 15) {
    parityValue = 0;
    $('#parity').val(parityValue);
  } else if (parityValue < 0) {
    parityValue = 0;
    $('#parity').val(parityValue);
  }

  if (parityValue > 0) {
    $('#noChild').show();
  } else {
    $('#noChild').hide();
  }
}

function pbYes() {
  if ($('#pbYes').is(':checked')) {
    $('#PBN').show();
  }
  else {
    $('#PBN').hide();
    $('#PBInput').val('');
  }
}

function dcisY() {
  if ($('#dcisY').is(':checked')) {
    $('#dcisGradeSec').show();
  }
  else {
    $('#dcisGradeSec').hide();
    $('#dcisGrade').val('');

  }
}

function MetaPT() {
  if ($('#MPTYes').is(':checked')) {
    $('#mptA').show();
    $('#mptS').show();
    $('#mptRS').show();
  }
  else {
    $('#mptA').hide();
    $('#mptS').hide();
    $('#mptRS').hide();
    $('#mpt_age').val('');
    $('#mpt_site').val('');
    $('#mpt_rs').val('');
  }
}
