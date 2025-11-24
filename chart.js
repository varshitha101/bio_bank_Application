function ageChart(countUnder30, count30to40, count41to50, count51to60, countAbove60) {
  // console.log("Age categories count:");
  // console.log("<30: " + countUnder30);
  // console.log("30-40: " + count30to40);
  // console.log("41-50: " + count41to50);
  // console.log("51-60: " + count51to60);
  // console.log(">60: " + countAbove60);
  var chartDom = document.getElementById("chart1");
  var myChart = echarts.init(chartDom);
  myChart.clear();

  var option;
  if (countUnder30 === 0 && count30to40 === 0 && count41to50 === 0 && count51to60 === 0 && countAbove60 === 0) {
    option = {
      title: {
        text: "No Data Available",
        left: "center",
        top: "middle",
        textStyle: {
          fontSize: 15,
          color: "#888",
        },
      },
    };
    option && myChart.setOption(option);
    return true;
  } else {
    option = {
      tooltip: {
        trigger: "item",
      },
      legend: {
        top: "5%",
        left: "center",
      },
      series: [
        {
          type: "pie",
          radius: ["40%", "70%"],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: "#fff",
            borderWidth: 2,
          },
          label: {
            show: false,
            position: "center",
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 25,
              fontWeight: "bold",
            },
          },
          labelLine: {
            show: false,
          },
          data: [
            { value: countUnder30, name: "<30y" },
            { value: count30to40, name: "30y-40y" },
            { value: count41to50, name: "40y-50y" },
            { value: count51to60, name: "50y-60y" },
            { value: countAbove60, name: ">60y" },
          ],
        },
      ],
    };
    option && myChart.setOption(option);
    return false;
  }
}

function cancerChart(breastCancer, throatCancer, liverCancer, lungCancer) {
  var chartDom = document.getElementById("chart2");

  var myChart = echarts.init(chartDom);
  myChart.clear();
  var option;

  if (breastCancer === 0 && throatCancer === 0 && liverCancer === 0 && lungCancer === 0) {
    option = {
      title: {
        text: "No Data Available",
        left: "center",
        top: "middle",
        textStyle: {
          fontSize: 15,
          color: "#888",
        },
      },
    };
    option && myChart.setOption(option);
    return true;
  } else {
    option = {
      tooltip: {
        trigger: "item",
      },
      legend: {
        top: "5%",
        left: "center",
      },
      series: [
        {
          type: "pie",
          radius: ["40%", "70%"],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: "#fff",
            borderWidth: 2,
          },
          label: {
            show: false,
            position: "center",
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 25,
              fontWeight: "bold",
            },
          },
          labelLine: {
            show: false,
          },
          data: [
            { value: breastCancer, name: "Breast" },
            { value: throatCancer, name: "Throat" },
            { value: liverCancer, name: "Liver" },
            { value: lungCancer, name: "Lung" },
          ],
        },
      ],
    };
    option && myChart.setOption(option);
    return false;
  }
}

function procedureChart(biopsy, resection) {
  var chartDom = document.getElementById("chart3");
  var myChart = echarts.init(chartDom);
  myChart.clear();
  var option;

  if (biopsy === 0 && resection === 0) {
    option = {
      title: {
        text: "No Data Available",
        left: "center",
        top: "middle",
        textStyle: {
          fontSize: 15,
          color: "#888",
        },
      },
    };
    option && myChart.setOption(option);
    return true;
  } else {
    option = {
      tooltip: {
        trigger: "item",
      },
      legend: {
        top: "5%",
        left: "center",
      },
      series: [
        {
          type: "pie",
          radius: ["40%", "70%"],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: "#fff",
            borderWidth: 2,
          },
          label: {
            show: false,
            position: "center",
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 25,
              fontWeight: "bold",
            },
          },
          labelLine: {
            show: false,
          },
          data: [
            { value: biopsy, name: "Biopsy" },
            { value: resection, name: "Resection" },
          ],
        },
      ],
    };
    option && myChart.setOption(option);
    return false;
  }
}

function sampleTypeChart(countBS, countSS, countOS, countRLT, countPC, countCombined) {
  var chartDom = document.getElementById("chart4");
  var myChart = echarts.init(chartDom);
  myChart.clear();
  var option;

  if (countBS === 0 && countSS === 0 && countOS === 0 && countRLT === 0 && countPC === 0 && countCombined === 0) {
    option = {
      title: {
        text: "No Data Available",
        left: "center",
        top: "middle",
        textStyle: {
          fontSize: 15,
          color: "#888",
        },
      },
    };
    option && myChart.setOption(option);
    return true;
  } else {
    option = {
      tooltip: {
        trigger: "item",
      },
      legend: {
        top: "5%",
        left: "center",
      },
      series: [
        {
          type: "pie",
          radius: ["40%", "70%"],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: "#fff",
            borderWidth: 2,
          },
          label: {
            show: false,
            position: "center",
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 25,
              fontWeight: "bold",
            },
          },
          labelLine: {
            show: false,
          },
          data: [
            { value: countBS, name: "Blood" },
            { value: countSS, name: "Tissue" },
            { value: countOS, name: "Other" },
            { value: countRLT, name: "RLT" },
            { value: countPC, name: "Primary Culture" },
            { value: countCombined, name: "Combined" },
          ],
        },
      ],
    };
    option && myChart.setOption(option);
    return false;
  }
}
