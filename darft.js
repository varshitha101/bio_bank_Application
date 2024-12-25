

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
  
  
  
  
  
  // const app = firebase.initializeApp(firebaseConfig);
  // const db = firebase.database(app);
  
  
  // let currentBloodBoxIndex = 0;
  let boxKeys = [];
  
  function populateBBData() {
    const path = 'bb/';
  
    db.ref(path).once('value')
      .then(snapshot => {
        const boxes = snapshot.val();
        if (boxes) {
          boxKeys = Object.keys(boxes); // Populate boxKeys here
          const boxVal = boxKeys[currentBloodBoxIndex]; // Use the initial index
          console.log("boxVal", boxVal);
  
          document.getElementById('box_id').textContent = boxVal;
          return db.ref(`bb/${boxVal}/`).once('value');
        } else {
          throw new Error('No boxes found in Firebase.');
        }
      })
      .then(snapshot => {
        const data = snapshot.val();
        if (data) {
          populateBBLabels(data);
        }
      })
      .catch(error => {
        console.error('Error fetching data from Firebase:', error);
      });
  }
  
  function populateBBLabels(data) {
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
        const labelName = `label_B${rows[row]}${col}`;
        const labelElement = document.getElementById(labelName);
        const index = row * cols + (col - 1);
  
        document.getElementById(labelName).addEventListener('click', function () {
          console.log('label name of click seat', labelName);
          $('#exampleModalCenter').modal('show');
        });
  
        if (labelElement) {
          // Set the text content if we have a bioBankId available
          labelElement.textContent = `${bioBankIds[index]} \n  ${sample[index]}` || ''; // Use empty string if undefined
          labelElement.style.fontWeight = "bold"
  
          if (sts[index] === "o") {
            labelElement.style.background = "rgb(129, 129, 192)"
          } else if (sts[index] === "s") {
            labelElement.style.background = "rgb(180, 180, 180)"
          } else if (sts[index] === "ps") {
            labelElement.style.background = "rgb(82, 54, 54)"
          }
          else if (sts[index] === "e") {
            labelElement.style.background = "rgb(143, 218, 187)"
  
          }
  
        }
      }
    }
  }
  
  
  function prev1Box() {
    if (currentBloodBoxIndex > 0) {
      currentBloodBoxIndex--;
      populateBBDataForCurrentBox();
    }
  }
  
  function next1Box() {
    if (currentBloodBoxIndex < boxKeys.length - 1) {
      currentBloodBoxIndex++;
      populateBBDataForCurrentBox();
    }
  }
  
  function populateBBDataForCurrentBox() {
    const boxVal = boxKeys[currentBloodBoxIndex]; // Use the current index
    console.log("boxVal", boxVal);
  
    document.getElementById('box_id').textContent = boxVal;
    db.ref(`bb/${boxVal}/`).once('value')
      .then(snapshot => {
        const data = snapshot.val();
        if (data) {
          populateBBLabels(data);
        }
      })
      .catch(error => {
        console.error('Error fetching data from Firebase:', error);
      });
  }
  
  
  
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
          const boxVal = sBBoxKeys[currentSpecimenBoxIndex];
          console.log("boxVal", boxVal);
  
          document.getElementById('sbox_id').textContent = boxVal;
          return db.ref(`sb/${boxVal}/`).once('value');
        } else {
          throw new Error('No boxes found in Firebase.');
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
  
        document.getElementById(labelName).addEventListener('click', function () {
          console.log('label name of click seat', labelName);
          $('#exampleModalCenter').modal('show');
        });
  
        if (labelElement) {
          labelElement.textContent = `${bioBankIds[index]} \n  ${sample[index]}` || '';
          labelElement.style.fontWeight = "bold"
  
          if (sts[index] === "o") {
            labelElement.style.background = "rgb(129, 129, 192)"
          } else if (sts[index] === "s") {
            labelElement.style.background = "rgb(180, 180, 180)"
          } else if (sts[index] === "ps") {
            labelElement.style.background = "rgb(82, 54, 54)"
          }
          else if (sts[index] === "e") {
            labelElement.style.background = "rgb(143, 218, 187)"
  
          }
        }
  
      }
    }
  }
  
  
  
  
  function prev2Box() {
    if (currentSpecimenBoxIndex > 0) {
      currentSpecimenBoxIndex--;
      populateSBDataForCurrentBox()
    }
  }
  
  function next2Box() {
    if (currentSpecimenBoxIndex < sBBoxKeys.length - 1) {
      currentSpecimenBoxIndex++;
      populateSBDataForCurrentBox()
    }
  }
  
  function populateSBDataForCurrentBox() {
    const boxVal = sBBoxKeys[currentSpecimenBoxIndex];
    console.log("boxVal", boxVal);
  
    document.getElementById('sbox_id').textContent = boxVal;
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
  
  
  
  // let specimenDataArray = {};
  // let specimenBoxCount = 1;
  // let currentSpecimenBoxIndex = 1;
  
  // function test2() {
  //   populateSpecimenBox("specimen-box-1", 100);
  //   saveSBToFirebase();
  // }
  
  // let totalSpecimenBoxes = 1;
  // let specimenSeatCounter = 0;
  
  
  // function populateSpecimenBox(boxName, n) {
  //   let seats1 = document.querySelector(`#${boxName}`);
  //   document.getElementById("sbox_id").innerHTML = `SB ${boxName}`;
  //   let k = 0;
  //   const components = ["FN-1", "FN-2", "FN-3", "FT-1", "FT-2", "FT-3"];
  
  //   specimenDataArray[boxName] = [];
  
  //   for (let i = 0; i < n; i++) {
  //     let booked = "";
  //     let componentId = "";
  //     let seat1ID = 'P' + (++specimenSeatCounter);
  //     let grid1Id = specimenSeatCounter;
  
  //     if (k === 3) {
  //       k = 0;
  //     }
  
  //     if (i >= 0 && i <= 49) {
  //       booked = "booked";
  //       componentId = components[k];
  //       k++;
  //     } else {
  //       booked = "unselected";
  //       componentId = "";
  //     }
  
  //     specimenDataArray[boxName].push({
  //       seatID: seat1ID,
  //       gridID: grid1Id,
  //       booked: booked,
  //       component: componentId || ""
  //     });
  //   }
  
  //   specimenDataArray[boxName].forEach((seat) => {
  //     let labelID = 'label_' + seat.seatID;
  //     let labelContent = seat.booked === "booked" ? 'BR_' + seat.gridID + " <br>" + seat.component : '';
  
  //     seats1.insertAdjacentHTML(
  //       "beforeend",
  //       '<input type="checkbox" name="tickets" id="' + seat.seatID + '" />' +
  //       '<label id="' + labelID + '" for="' + seat.seatID + '" class="seat ' + seat.booked + '">' +
  //       labelContent + '</label>'
  //     );
  
  //     document.getElementById(labelID).style.fontSize = '10px';
  //     document.getElementById(labelID).style.color = 'rgb(255, 255, 255)';
  //     document.getElementById(labelID).style.textAlign = 'center';
  
  //     let seatCheckbox = document.getElementById(seat.seatID);
  //     seatCheckbox.addEventListener('click', function () {
  //       openModal();
  //     });
  //   });
  
  //   console.log(specimenDataArray);
  // }
  
  // function addSpecimenBox() {
  //   totalSpecimenBoxes++;
  //   let newBoxName = "specimen-box-" + totalSpecimenBoxes;
  
  //   const newBox = `
  //     <div class="specimen-box" id="${newBoxName}" style="display: none;">
  //       <div class="status">
  //       <div class="item">Empty</div>
  //       <div class="item">Occupied</div>
  //       <div class="item">Partial Shared</div>
  //       <div class="item">Shared</div>
  //       </div>
  //     </div>
  //   `;
  
  //   document.getElementById("specimen-box-container").insertAdjacentHTML('beforeend', newBox);
  
  
  
  //   let seatLimit = 100;
  //   populateSpecimenBox(newBoxName, seatLimit);
  
  //   alert(`Specimen Box ${totalSpecimenBoxes} added`);
  // }
  
  
  
  
  
  
  
  
  
  function openModal(seatInfo) {
    $('#exampleModalCenter').modal('show');
  }
  
  
  
  
  
  
  
  
  function AppendBloodBox(boxName) {
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
    db.ref('bb/' + boxName + '/').set(newBoxData)
      .then(() => {
        console.log("New box added successfully to Firebase.");
      })
      .catch((error) => {
        console.error("Error saving new box to Firebase: ", error);
      });
  
  }
  
  function AppendSpecimenBox(boxName) {
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
    db.ref('sb/' + boxName + '/').set(newBoxData)
      .then(() => {
        console.log("New box added successfully to Firebase.");
      })
      .catch((error) => {
        console.error("Error saving new box to Firebase: ", error);
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
    const form1Data = validateForm1();
    const form2Data = validateForm2();
    const form3Data = validateForm3();
  
    // Check if all forms are valid (i.e., form data is returned and not false)
    if (form1Data && form2Data && form3Data) {
      const data = {
        ie: form1Data.ie,
        md: form2Data.md,
        brf: form3Data.brf
      };
      // if (update==='true') {
      //   updateToFirebase(data);
      // }
      // else{
        saveToFirebase(data);
      // }
  
      patients();
      return data;
    } else {
      return null;
    }
  }
  
  
  // Validate Form 1
  function validateForm1() {
  
  
    const arDate = document.getElementById('sampleReceivedDate').value; 
    const arTime = document.getElementById('sampleReceivedTime').value; 
  
    const ardt = `${arDate}T${arTime}`;
    const asrdt = new Date(ardt);
    const aRtimestamp = asrdt.getTime();
  
    const apDate = document.getElementById('sampleProcessedDate').value; 
    const apTime = document.getElementById('sampleProcessedTime').value; 
  
    const apdt = `${apDate}T${apTime}`;
    const asPdt = new Date(apdt);
    const aPtimestamp = asPdt.getTime();
  
  
    const brDate = document.getElementById('bloodSampleReceivedDate').value; 
    const brTime = document.getElementById('bloodSampleReceivedTime').value; 
  
    const brdt = `${brDate}T${brTime}`;
    const bsrdt = new Date(brdt);
    const bRtimestamp = bsrdt.getTime();
  
    const bpDate = document.getElementById('bloodSampleProcessedDate').value; 
    const bpTime = document.getElementById('bloodSampleProcessedTime').value; 
  
    const bpdt = `${bpDate}T${bpTime}`;
    const bsPdt = new Date(bpdt);
    const bPtimestamp = bsPdt.getTime();
  
    const srDate = document.getElementById('SpecimenSampleReceivedDate').value;
    const srTime = document.getElementById('SpecimenSampleReceivedTime').value;
  
    const srdt = `${srDate}T${srTime}`;
    const ssrdt = new Date(srdt);
    const sRtimestamp = ssrdt.getTime();
  
    const spDate = document.getElementById('SpecimenSampleProcessedDate').value; 
    const spTime = document.getElementById('SpecimenSampleProcessedTime').value; 
  
    const spdt = `${spDate}T${spTime}`;
    const ssPdt = new Date(spdt);
    const sPtimestamp = ssPdt.getTime();
  
    const orDate = document.getElementById('OtherSampleReceivedDate').value; 
    const orTime = document.getElementById('OtherSampleReceivedTime').value; 
  
    const ordt = `${orDate}T${orTime}`;
    const osrdt = new Date(ordt);
    const oRtimestamp = osrdt.getTime();
  
    const opDate = document.getElementById('OtherSampleProcessedDate').value;
    const opTime = document.getElementById('OtherSampleProcessedTime').value;
  
    const opdt = `${opDate}T${opTime}`;
    const osPdt = new Date(opdt);
    const oPtimestamp = osPdt.getTime();
  
  
    const form1Data = {
      ie: {
  
        ag: document.getElementById('patAge').value,
        sx: document.querySelector('input[name="customRadio"]:checked').value,
        ct: document.querySelector('input[name="radioCancerType"]:checked').value,
        stc: document.querySelector('input[name="radioCancerStage"]:checked').value,
        tpr: document.querySelector('input[name="customProcedure"]:checked').value,
        dpr: document.getElementById('procedureDetail').value,
        srn: document.getElementById('surgeonName').value,
        ss: document.querySelector('input[name="specimenSample"]:checked').value,
        nft: document.getElementById('ft_tubes').value,
        nfn: document.getElementById('fn_tubes').value,
        bs: document.querySelector('input[name="bloodSample"]:checked').value,
        bpg: document.getElementById('PlasmagridNo').value,
        bsg: document.getElementById('SerumgridNo').value,
        bbcg: document.getElementById('bufferCoatgridNo').value,
        osmp: document.querySelector('input[name="otherSample"]:checked').value,
        osg: document.getElementById('OSgridNo').value,
        osdsc: document.getElementById('otSampleDesc').value,
        mts: document.querySelector('input[name="MetastasisSample"]:checked').value,
        cnst: document.querySelector('input[name="customConsent"]:checked').value,
        iss: document.querySelector('input[name="IschemicRadio"]:checked').value,
        prb: document.getElementById('processedBy').value,
        scpt: document.querySelector('input[name="processedRadio"]:checked').value,
        srt: aRtimestamp,
        spt: aPtimestamp,
        brt: bRtimestamp,
        bpt: bPtimestamp,
        sprt: sRtimestamp,
        sppt: sPtimestamp,
        osrt: oRtimestamp,
        ospt: oPtimestamp,
        sef_ub: 'currentUser'
      }
    };
  
    // // Check if all necessary fields are filled in Form 1
    // for (const key in form1Data.ie) {
    //   if (!form1Data.ie[key]) {
    //     alert(`Please fill in the field: ${key}`);
    //     return false;
    //   }
    // }
  
    return form1Data;
  }
  
  // Validate Form 2
  function validateForm2() {
  
    let tL = document.getElementById('tumorSizeL').value;
    let tW = document.getElementById('tumorSizeW').value;
    let tH = document.getElementById('tumorSizeH').value;
    let tumorSize = `${tL}x${tW}x${tH}`;
    const form2Data = {
      md: {
        fhc: document.querySelector('input[name="RadioFHabit"]:checked').value || "",
        fhcr: document.getElementById('familyRelation').value || "",
        fhct: document.getElementById('familyCancerType').value || "",
        fh: document.querySelector('input[name="RadioFdHabit"]:checked').value || "",
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
        gd: document.getElementById('sampleGrade')?.value || "",
        fc: document.querySelector('input[name="focal"]:checked')?.value || "",
        lvi: document.querySelector('input[name="LVI"]:checked')?.value || "",
        pni: document.querySelector('input[name="PNI"]:checked')?.value || "",
        ptnm: document.getElementById('pTNM')?.value || "",
        as: document.getElementById('AJCC').value || "",
        nnt: document.getElementById('nodesTested').value || "",
        npn: document.getElementById('positiveNodes').value || "",
        tsz: tumorSize,
        dm: document.querySelector('input[name="denovo"]:checked')?.value || "",
        mpt: document.querySelector('input[name="MPT"]:checked')?.value || "",
        btn: document.getElementById('btHPEInput').value || "",
        bd: document.getElementById('biopsyDate').value || "",
        nact: document.querySelector('input[name="NACT"]:checked')?.value || "",
        nactdc: document.getElementById('NACT_cycle').value || "",
        nactdlc: document.getElementById('NACT_cycle_D').value || "",
        stn: document.getElementById('StHPEInput').value || "",
        sd: document.getElementById('surgeryDate').value || "",
        rcbs: document.getElementById('rcbScores').value || "",
        act: document.querySelector('input[name="ACT"]:checked')?.value || "",
        actdc: document.getElementById('actDrugCycles').value || "",
        actdls: document.getElementById('actDateLastCycle').value || "",
        rd: document.querySelector('input[name="RadioT"]:checked')?.value || "",
        rdd: document.getElementById('radiotherapyDetails').value || "",
        rtdls: document.getElementById('radiotherapyLastCycleDate').value || "",
        mdu: 'currentUser',
        ipba: document.querySelector('input[name="isParaffinBlockAvailable"]:checked')?.value || ""
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
        am: document.getElementById('ageAtMenarche').value || "",
        pty: document.getElementById('parity').value || "",
        noc: document.getElementById('numChild').value || "",
        afc: document.getElementById('ageAtFirstChild').value || "",
        bf: document.querySelector('input[name="breFd"]:checked')?.value || "",
        dbf: document.getElementById('dbf').value || "",
        ms: document.querySelector('input[name="mStatus"]:checked')?.value || "",
        ad: document.getElementById('ad').value || "",
        er: document.querySelector('input[name="ERRadio"]:checked')?.value || "",
        pr: document.querySelector('input[name="PRRadio"]:checked')?.value || "",
        h2: document.querySelector('input[name="HER2Radio"]:checked')?.value || "",
        sbt: document.getElementById('sbt').value || "",
        k67: document.getElementById('k67').value || "",
        cs: document.getElementById('ClinicalS').value || "",
        ht: document.getElementById('HistologicalS').value || "",
        sps: document.getElementById('sps').value || ""
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
  
      db.ref(`sef/${bioBankId}/${nextSection}/${timestamp}`).set(data)
        .then(() => {
          alert('Form submitted successfully to ' + nextSection);
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
        gndr: document.querySelector('input[name="customRadio"]:checked').value, // Gender
        ct: document.querySelector('input[name="radioCancerType"]:checked').value, // Type of Cancer
        stc: document.querySelector('input[name="radioCancerStage"]:checked').value, // Stage of Cancer
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
  
  
  
  // document.addEventListener('DOMContentLoaded', function () {
  //   // Get the patient data from localStorage
  //   const patientDataStr = localStorage.getItem('patientData');
  
  //   // Check if the data exists and is not null or empty
  //   if (patientDataStr) {
  //     try {
  //       // Parse the data and handle it
  //       const patientData = JSON.parse(patientDataStr);
  
  //       if (patientData) {
  //         // Fill in the input fields with patient data
  //         document.getElementById('patAge').value = patientData.ag || '';
  //         document.querySelector(`input[name="customRadio"][value="${patientData.sx}"]`).checked = true;
  //         document.querySelector(`input[name="radioCancerType"][value="${patientData.ct}"]`).checked = true;
  //         document.querySelector(`input[name="radioCancerStage"][value="${patientData.stc}"]`).checked = true;
  //         document.querySelector(`input[name="customProcedure"][value="${patientData.tpr}"]`).checked = true;
  //         document.getElementById('procedureDetail').value = patientData.dpr || '';
  //         document.getElementById('surgeonName').value = patientData.srn || '';
  //         document.querySelector(`input[name="specimenSample"][value="${patientData.ss}"]`).checked = true;
  //         document.getElementById('ft_tubes').value = patientData.nft || '';
  //         document.getElementById('fn_tubes').value = patientData.nfn || '';
  //         document.querySelector(`input[name="bloodSample"][value="${patientData.bs}"]`).checked = true;
  //         document.getElementById('PlasmagridNo').value = patientData.bpg || '';
  //         document.getElementById('SerumgridNo').value = patientData.bsg || '';
  //         document.getElementById('bufferCoatgridNo').value = patientData.bbcg || '';
  //         document.querySelector(`input[name="otherSample"][value="${patientData.osmp}"]`).checked = true;
  //         document.getElementById('OSgridNo').value = patientData.osg || '';
  //         document.getElementById('otSampleDesc').value = patientData.osdsc || '';
  //         document.querySelector(`input[name="MetastasisSample"][value="${patientData.mts}"]`).checked = true;
  //         document.querySelector(`input[name="customConsent"][value="${patientData.cnst}"]`).checked = true;
  //         document.querySelector(`input[name="IschemicRadio"][value="${patientData.iss}"]`).checked = true;
  //         document.getElementById('processedBy').value = patientData.prb || '';
  //         document.querySelector(`input[name="processedRadio"][value="${patientData.scpt}"]`).checked = true;
  //         document.getElementById('sampleReceivedTime').value = patientData.srt || '';
  //         document.getElementById('sampleProcessedTime').value = patientData.spt || '';
  //         document.getElementById('bloodSampleReceivedTime').value = patientData.brt || '';
  //         document.getElementById('bloodSampleProcessedTime').value = patientData.bpt || '';
  //         document.getElementById('SpecimenSampleReceivedTime').value = patientData.sprt || '';
  //         document.getElementById('SpecimenSampleProcessedTime').value = patientData.sppt || '';
  //         document.getElementById('OtherSampleReceivedTime').value = patientData.osrt || '';
  //         document.getElementById('OtherSampleProcessedTime').value = patientData.ospt || '';
  //         const inputs = document.querySelectorAll('input, select, textarea');
  //         inputs.forEach(input => {
  //           input.disabled = true;
  //         });
  //       }
  //     } catch (e) {
  //       console.error("Error parsing patient data from localStorage:", e);
  //     }
  //   }
  //   // Disable all input fields
  
  
  // });
  
  const upUrlParams = new URLSearchParams(window.location.search);
  const update = upUrlParams.get('upadte');
  
  
  
  function pages_display(mode, bioBankId, seq, timestampKey) {
    console.log("mode", mode);
    console.log("bioBankId", bioBankId);
    console.log("seq", seq);
    console.log("timestampKey", timestampKey);
  
    const dataPath = `sef/${bioBankId}/${seq}/${timestampKey}`;
    console.log("datapath", dataPath);
    console.log("DataConfig", db);
    localStorage.setItem('bioid', bioBankId);
    localStorage.setItem('mode', mode)
  
    // Fetch the data from the Firebase database
    db.ref(dataPath).once('value')
      .then(snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          console.log("Fetched data:", data);
  
          // Store the data in sessionStorage
          sessionStorage.setItem('formData', JSON.stringify(data));
  
          // If mode is 'SampleView', disable all form elements
          if (mode === 'SearchView') {
            window.location.href = `default.html?hideMnrId=true`;
          }
          if (mode === 'SearchEdit') {
            window.location.href = `default.html?upadte=true`;
          }
        } else {
          console.error('No data found at the specified path');
        }
      }).catch(error => {
        console.error("Error fetching data:", error);
      });
  }
  
  
  
  
  function fillIeForm(ieData) {
    const bioid = localStorage.getItem('bioid')
    console.log("bibioBankId", bioid);
    document.getElementById('bioBankId').value = bioid;
    document.getElementById('patAge').value = ieData.ag || '';
    document.querySelector(`input[name="customRadio"][value="${ieData.sx}"]`).checked = true || '';
    document.querySelector(`input[name="radioCancerType"][value="${ieData.ct}"]`).checked = true || '';
    document.querySelector(`input[name="radioCancerStage"][value="${ieData.stc}"] `).checked = true || '';
    document.querySelector(`input[name="customProcedure"][value="${ieData.tpr}"]`).checked = true;
    document.getElementById('procedureDetail').value = ieData.dpr || '';
    document.getElementById('surgeonName').value = ieData.srn;
    console.log("surgeonName", ieData.srn)
    document.querySelector(`input[name="specimenSample"][value="${ieData.ss}"]`).checked = true;
    document.getElementById('ft_tubes').value = ieData.nft || '';
    document.getElementById('fn_tubes').value = ieData.nfn || '';
    document.querySelector(`input[name="bloodSample"][value="${ieData.bs}"]`).checked = true;
    document.getElementById('PlasmagridNo').value = ieData.bpg || '';
    document.getElementById('SerumgridNo').value = ieData.bsg || '';
    document.getElementById('bufferCoatgridNo').value = ieData.bbcg || '';
    document.querySelector(`input[name="otherSample"][value="${ieData.osmp}"]`).checked = true;
    document.getElementById('OSgridNo').value = ieData.osg || '';
    document.getElementById('otSampleDesc').value = ieData.osdsc || '';
    document.querySelector(`input[name="MetastasisSample"][value="${ieData.mts}"]`).checked = true;
    document.querySelector(`input[name="customConsent"][value="${ieData.cnst}"]`).checked = true;
    document.querySelector(`input[name="IschemicRadio"][value="${ieData.iss}"]`).checked = true;
    document.getElementById('processedBy').value = ieData.prb || '';
    document.querySelector(`input[name="processedRadio"][value="${ieData.scpt}"]`).checked = true;
    const formatTimestamp = (timestamp) => {
      if (!timestamp) return { date: '', time: '' };
      const dateObj = new Date(timestamp);
      const date = dateObj.toISOString().split('T')[0]; // Extracting date in YYYY-MM-DD format
      const time = dateObj.toTimeString().split(' ')[0]; // Extracting time in HH:MM:SS format
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
  }
  
  function fillMdForm(mdData) {
    document.querySelector(`input[name="RadioFHabit"][value="${mdData.fhc}"]`).checked = true;
    document.getElementById('familyRelation').value = mdData.fhcr || '';
    document.getElementById('familyCancerType').value = mdData.fhct || '';
    document.querySelector(`input[name="RadioFdHabit"][value="${mdData.fh}"]`).checked = true;
    if (mdData.hac) document.querySelector(`input[name="RadioAlcoholHabit"][value="${mdData.hac}"]`).checked = true;
    if (mdData.hs) document.querySelector(`input[name="RadioSmokeHabit"][value="${mdData.hs}"]`).checked = true;
    document.querySelector(`input[name="ECH"][value="${mdData.ec}"]`).checked = true;
    document.getElementById('comorbidityMedications').value = mdData.ecm || '';
    document.getElementById('ffQcComments').value = mdData.ffqc || '';
    document.getElementById('ffTissueRemarks').value = mdData.ftr || '';
    document.querySelector(`input[name="tumorSite"][value="${mdData.tst}"]`).checked = true;
    document.getElementById('tumorPercentage').value = mdData.tp || '';
    document.getElementById('ageAtDiagnosis').value = mdData.ad || '';
    document.getElementById('clinicalStage').value = mdData.cs || '';
    if (mdData.ihcm) document.querySelector(`input[name="IHC"][value="${mdData.ihcm}"]`).checked = true;
    document.getElementById('IHC_Description').value = mdData.ihcd || '';
    if (mdData.gt) document.querySelector(`input[name="GeneticT"][value="${mdData.gt}"]`).checked = true;
    document.getElementById('GT_Description').value = mdData.gtd || '';
    document.getElementById('subtype').value = mdData.pst || '';
    document.getElementById('sampleGrade').value = mdData.gd || '';
    if (mdData.fc) document.querySelector(`input[name="focal"][value="${mdData.fc}"]`).checked = true;
    if (mdData.lvi) document.querySelector(`input[name="LVI"][value="${mdData.lvi}"]`).checked = true;
    if (mdData.pni) document.querySelector(`input[name="PNI"][value="${mdData.pni}"]`).checked = true;
    document.getElementById('pTNM').value = mdData.ptnm || '';
    document.getElementById('AJCC').value = mdData.as || '';
    document.getElementById('nodesTested').value = mdData.nnt || '';
    document.getElementById('positiveNodes').value = mdData.npn || '';
    if (mdData.tsz) {
      const [tL, tW, tH] = mdData.tsz.split('x');
  
      document.getElementById('tumorSizeL').value = tL;
      document.getElementById('tumorSizeW').value = tW;
      document.getElementById('tumorSizeH').value = tH;
    } if (mdData.dm) document.querySelector(`input[name="denovo"][value="${mdData.dm}"]`).checked = true;
    if (mdData.mpt) document.querySelector(`input[name="MPT"][value="${mdData.mpt}"]`).checked = true;
    document.getElementById('btHPEInput').value = mdData.btn || '';
    document.getElementById('biopsyDate').value = mdData.bd || '';
    if (mdData.nact) document.querySelector(`input[name="NACT"][value="${mdData.nact}"]`).checked = true;
    document.getElementById('NACT_cycle').value = mdData.nactdc || '';
    document.getElementById('NACT_cycle_D').value = mdData.nactdlc || '';
    document.getElementById('StHPEInput').value = mdData.stn || '';
    document.getElementById('surgeryDate').value = mdData.sd || '';
    document.getElementById('rcbScores').value = mdData.rcbs || '';
    if (mdData.act) document.querySelector(`input[name="ACT"][value="${mdData.act}"]`).checked = true;
    document.getElementById('actDrugCycles').value = mdData.actdc || '';
    document.getElementById('actDateLastCycle').value = mdData.actdls || '';
    if (mdData.rd) document.querySelector(`input[name="RadioT"][value="${mdData.rd}"]`).checked = true;
    document.getElementById('radiotherapyDetails').value = mdData.rdd || '';
    document.getElementById('radiotherapyLastCycleDate').value = mdData.rtdls || '';
    if (mdData.ipba) document.querySelector(`input[name="isParaffinBlockAvailable"][value="${mdData.ipba}"]`).checked = true;
    document.getElementById('processedBy').value = mdData.mdu || 'currentUser';
  }
  
  
  function fillBrfForm(brfData) {
    document.getElementById('ageAtMenarche').value = brfData.am || '';
    document.getElementById('parity').value = brfData.pty || '';
    document.getElementById('numChild').value = brfData.noc || '';
    document.getElementById('ageAtFirstChild').value = brfData.afc || '';
    if (brfData.bf !== undefined) {
      document.querySelector(`input[name="breFd"][value="${brfData.bf}"]`).checked = true;
    }
    document.getElementById('dbf').value = brfData.dbf || '';
    if (brfData.ms) {
      document.querySelector(`input[name="mStatus"][value="${brfData.ms}"]`).checked = true;
    }
    document.getElementById('ad').value = brfData.ad || '';
    if (brfData.er !== undefined) {
      document.querySelector(`input[name="ERRadio"][value="${brfData.er}"]`).checked = true;
    }
    if (brfData.pr !== undefined) {
      document.querySelector(`input[name="PRRadio"][value="${brfData.pr}"]`).checked = true;
    }
    if (brfData.h2 !== undefined) {
      document.querySelector(`input[name="HER2Radio"][value="${brfData.h2}"]`).checked = true;
    }
    document.getElementById('sbt').value = brfData.sbt || '';
    document.getElementById('k67').value = brfData.k67 || '';
    document.getElementById('ClinicalS').value = brfData.cs || '';
    document.getElementById('HistologicalS').value = brfData.ht || '';
    document.getElementById('sps').value = brfData.sps || '';
    document.getElementById('processedBy').value = brfData.brfu || 'currentUser';
  }
  
  
  // function updateToFirebase(data) {
  //   const bioBankId = document.getElementById('bioBankId').value;
  //   const timestamp = Math.floor(Date.now() / 1000); // Current timestamp in seconds
  
    
  
  //   // Fetch existing data from the Firebase database under the current section
  //   db.ref(`sef/${bioBankId}`).once('value', snapshot => {
  //     const sections = snapshot.val();
  
  //     if (sections) {
  //       // Get the latest section (assuming there is only one section)
  //       const sectionKeys = Object.keys(sections);
  //       const lastSection = sectionKeys[sectionKeys.length - 1]; // Use the last section (latest)
  //       alert("Hi Bhanu");
  
  //       // Format the new data to be added under the new timestamp
  //       const formattedData = {
  //         ie: data.ie, 
  //         md: data.md, 
  //         brf: data.brf
  //       };
  
  //       // Add new data under the new timestamp in the same section
  //       db.ref(`sef/${bioBankId}/${lastSection}/${timestamp}`).set(data)
  //         .then(() => {
  //           alert('Form submitted successfully to ' + lastSection);
  //         })
  //         .catch((error) => {
  //           console.error('Error writing to Firebase', error);
  //         });
  
  //     } else {
  //       // If no section exists, create the first section
  //       const firstSection = `s1`;
  
  //       db.ref(`sef/${bioBankId}/${firstSection}/${timestamp}`).set(data)
  //         .then(() => {
  //           alert('Form submitted successfully to ' + firstSection);
  //         })
  //         .catch((error) => {
  //           console.error('Error writing to Firebase', error);
  //         });
  //     }
  
  //     // Also update the `bbnmrn` reference with MRN Number to Bio Bank ID mapping
  //     const mrnData = document.getElementById('mrnNo').value;
  //     db.ref(`bbnmrn/${mrnData}`).set(bioBankId)
  //       .then(() => {
  //         console.log('Stored in bbnmrn');
  //       })
  //       .catch((error) => {
  //         console.log('Not stored in bbnmrn');
  //       });
  //   });
  // }