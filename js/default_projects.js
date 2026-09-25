/**
 * Default Bundled Projects for Offline and Web Hosting
 * Copyright (C) ENG-MOSTAFAELMGHRABY
 */

window.DEFAULT_BUNDLED_PROJECTS = [
  {
    "id": "feeder_1789823077015",
    "name": "خط المعصرة",
    "administration": "بني مزار شرق",
    "substation": "لوحة المركز القديمة",
    "voltage_kv": 11,
    "nodes": [
      {
        "id": "N1",
        "type": "substation",
        "name": "لوحة المركز القديمة",
        "x": 362.1212121212121,
        "y": 994,
        "subType": "board"
      },
      {
        "id": "N2",
        "type": "switch",
        "name": "سكينة N2",
        "x": 362.1212121212121,
        "y": 891.0877336378339,
        "state": "open",
        "dir": "up",
        "direction": "vertical"
      },
      {
        "id": "N3",
        "type": "switch",
        "name": "سكينة N3",
        "x": 362.1212121212121,
        "y": 671.0877336378339,
        "state": "open",
        "dir": "left",
        "direction": "horizontal"
      },
      {
        "id": "N4",
        "type": "transformer",
        "name": "اتصالات مصر",
        "x": 102.12121212121212,
        "y": 671.0877336378339,
        "capacity": 50,
        "loading_pct": 60,
        "direction": "left"
      },
      {
        "id": "N5",
        "type": "switch",
        "name": "سكينة N5",
        "x": 362.1212121212121,
        "y": 451.08773363783394,
        "state": "open",
        "dir": "right",
        "direction": "horizontal"
      },
      {
        "id": "N6",
        "type": "junction",
        "name": "نقطة N6",
        "x": 622.1212121212121,
        "y": 451.08773363783394
      },
      {
        "id": "N7",
        "type": "junction",
        "name": "نقطة N7",
        "x": 622.1212121212121,
        "y": 231.08773363783394
      },
      {
        "id": "N8",
        "type": "transformer",
        "name": "م الحلمية الشرقي",
        "x": 622.1212121212121,
        "y": 11.087733637833935,
        "capacity": 160,
        "loading_pct": 75,
        "direction": "up"
      },
      {
        "id": "N9",
        "type": "switch",
        "name": "سكينة N9",
        "x": 764.9318792091323,
        "y": 88.2770665499138,
        "state": "open",
        "dir": "right",
        "direction": "horizontal"
      },
      {
        "id": "N10",
        "type": "kiosk",
        "name": "ك اولاد غانم",
        "x": 917.0177861216725,
        "y": 88.2770665499138,
        "capacity": 300,
        "loading_pct": 65,
        "direction": "up",
        "switches_count": 2,
        "has_outgoing": false
      },
      {
        "id": "N11",
        "type": "switch",
        "name": "سكينة N11",
        "x": 882.1212121212121,
        "y": 451.08773363783394,
        "state": "open",
        "dir": "down",
        "direction": "vertical"
      },
      {
        "id": "N12",
        "type": "kiosk",
        "name": "انارة ام الساس الدائري",
        "x": 1096.4904153251614,
        "y": 767.2035143130823,
        "capacity": 200,
        "loading_pct": 65,
        "direction": "right",
        "switches_count": 2,
        "has_outgoing": true,
        "outgoing_terminal": "top"
      },
      {
        "id": "N13",
        "type": "kiosk",
        "name": "ام الساس الوسط",
        "x": 1156.6984096907127,
        "y": 602.2070680846318,
        "capacity": 200,
        "loading_pct": 65,
        "direction": "right",
        "switches_count": 2,
        "has_outgoing": true,
        "outgoing_terminal": "bottom"
      },
      {
        "id": "N14",
        "type": "junction",
        "name": "نقطة N14",
        "x": 1156.6984096907127,
        "y": 711.535742651841
      }
    ],
    "sections": [
      {
        "id": "S1",
        "from_node": "N1",
        "to_node": "N2",
        "type": "كابل",
        "size": "3*240",
        "length": 152,
        "direction": "up",
        "_smartLabel": {
          "x": 420.1212121212121,
          "y": 942.543866818917,
          "side": "right",
          "tier": 1,
          "midX": 362.1212121212121,
          "midY": 942.543866818917,
          "isVertical": true
        }
      },
      {
        "id": "S2",
        "from_node": "N2",
        "to_node": "N3",
        "type": "هوائي",
        "size": "150/25",
        "length": 500,
        "direction": "up",
        "tap_side": "after_switch",
        "_smartLabel": {
          "x": 420.1212121212121,
          "y": 765.0877336378339,
          "side": "right",
          "tier": 1,
          "midX": 362.1212121212121,
          "midY": 765.0877336378339,
          "isVertical": true
        }
      },
      {
        "id": "S3",
        "from_node": "N3",
        "to_node": "N4",
        "type": "كابل",
        "size": "3*70",
        "length": 200,
        "direction": "left",
        "tap_side": "after_switch",
        "_smartLabel": {
          "x": 216.12121212121212,
          "y": 649.0877336378339,
          "side": "top",
          "tier": 1,
          "midX": 216.12121212121212,
          "midY": 671.0877336378339,
          "isVertical": false
        }
      },
      {
        "id": "S4",
        "from_node": "N3",
        "to_node": "N5",
        "type": "هوائي",
        "size": "150/25",
        "length": 6600,
        "direction": "up",
        "tap_side": "before_switch",
        "_smartLabel": {
          "x": 420.1212121212121,
          "y": 561.0877336378339,
          "side": "right",
          "tier": 1,
          "midX": 362.1212121212121,
          "midY": 561.0877336378339,
          "isVertical": true
        }
      },
      {
        "id": "S5",
        "from_node": "N5",
        "to_node": "N6",
        "type": "هوائي",
        "size": "35/6",
        "length": 1100,
        "direction": "right",
        "tap_side": "after_switch",
        "_smartLabel": {
          "x": 508.1212121212121,
          "y": 429.08773363783394,
          "side": "top",
          "tier": 1,
          "midX": 508.1212121212121,
          "midY": 451.08773363783394,
          "isVertical": false
        }
      },
      {
        "id": "S6",
        "from_node": "N6",
        "to_node": "N7",
        "type": "هوائي",
        "size": "35/6",
        "length": 100,
        "direction": "up",
        "_smartLabel": {
          "x": 680.1212121212121,
          "y": 341.08773363783394,
          "side": "right",
          "tier": 1,
          "midX": 622.1212121212121,
          "midY": 341.08773363783394,
          "isVertical": true
        }
      },
      {
        "id": "S7",
        "from_node": "N7",
        "to_node": "N8",
        "type": "هوائي",
        "size": "70/12",
        "length": 180,
        "direction": "up",
        "_smartLabel": {
          "x": 680.1212121212121,
          "y": 121.08773363783394,
          "side": "right",
          "tier": 1,
          "midX": 622.1212121212121,
          "midY": 121.08773363783394,
          "isVertical": true
        }
      },
      {
        "id": "S8",
        "from_node": "N7",
        "to_node": "N9",
        "type": "هوائي",
        "size": "35/6",
        "length": 200,
        "direction": "right",
        "_smartLabel": {
          "x": 635.5265456651722,
          "y": 159.68240009387387,
          "side": "left",
          "tier": 1,
          "midX": 693.5265456651722,
          "midY": 159.68240009387387,
          "isVertical": true
        }
      },
      {
        "id": "S9",
        "from_node": "N9",
        "to_node": "N10",
        "type": "كابل",
        "size": "3*150",
        "length": 430,
        "direction": "right",
        "tap_side": "after_switch",
        "_smartLabel": {
          "x": 856.9748326654023,
          "y": 66.2770665499138,
          "side": "top",
          "tier": 1,
          "midX": 856.9748326654023,
          "midY": 88.2770665499138,
          "isVertical": false
        }
      },
      {
        "id": "S10",
        "from_node": "N6",
        "to_node": "N11",
        "type": "هوائي",
        "size": "70/12",
        "length": 360,
        "direction": "right",
        "_smartLabel": {
          "x": 752.1212121212121,
          "y": 429.08773363783394,
          "side": "top",
          "tier": 1,
          "midX": 752.1212121212121,
          "midY": 451.08773363783394,
          "isVertical": false
        }
      },
      {
        "id": "S11",
        "from_node": "N11",
        "to_node": "N12",
        "type": "كابل",
        "size": "3*150",
        "length": 65,
        "direction": "down",
        "tap_side": "after_switch",
        "_smartLabel": {
          "x": 1047.3058137231867,
          "y": 629.1456239754582,
          "side": "right",
          "tier": 1,
          "midX": 989.3058137231867,
          "midY": 629.1456239754582,
          "isVertical": true
        },
        "deflection_offset": 0
      },
      {
        "id": "S12",
        "from_node": "N12",
        "to_node": "N13",
        "type": "كابل",
        "size": "3*70",
        "length": 200,
        "direction": "up",
        "_smartLabel": {
          "x": 1184.594412507937,
          "y": 676.7052911988571,
          "side": "right",
          "tier": 1,
          "midX": 1126.594412507937,
          "midY": 676.7052911988571,
          "isVertical": true
        },
        "deflection_offset": 0
      },
      {
        "id": "S13",
        "from_node": "N13",
        "to_node": "N14",
        "type": "كابل",
        "size": "3*70",
        "length": 340,
        "direction": "down",
        "_smartLabel": {
          "x": 1232.6984096907127,
          "y": 660.8714053682364,
          "side": "right",
          "tier": 2,
          "midX": 1156.6984096907127,
          "midY": 660.8714053682364,
          "isVertical": true
        }
      }
    ],
    "designer": "ENG-MOSTAFAELMGHRABY",
    "copyright": "جميع الحقوق محفوظة للمهندس مصطفى المغربي © ENG-MOSTAFAELMGHRABY",
    "updated_at": "2026-09-20 09:31"
  },
  {
    "id": "rasm_tagreby",
    "name": "مخطط لوحة المركز القديمة (رسم تجريبي)",
    "substation": "لوحة المركز القديمة",
    "voltage_kv": 11,
    "designer": "ENG-MOSTAFAELMGHRABY",
    "copyright": "جميع الحقوق محفوظة للمهندس مصطفى المغربي © ENG-MOSTAFAELMGHRABY",
    "nodes": [
      {
        "id": "N1",
        "type": "substation",
        "name": "لوحة المركز القديمة",
        "x": 300,
        "y": 70
      },
      {
        "id": "N2",
        "type": "switch",
        "name": "سكينة N2",
        "x": 300,
        "y": 200,
        "direction": "vertical",
        "state": "closed"
      },
      {
        "id": "N3",
        "type": "switch",
        "name": "سكينة N3",
        "x": 300,
        "y": 360,
        "direction": "horizontal",
        "state": "closed"
      },
      {
        "id": "N4",
        "type": "transformer",
        "name": "اتصالات مصر",
        "capacity": 50,
        "loading_pct": 75,
        "x": 120,
        "y": 360,
        "direction": "left"
      },
      {
        "id": "N5",
        "type": "switch",
        "name": "سكينة N5",
        "x": 300,
        "y": 680,
        "direction": "vertical",
        "state": "closed"
      },
      {
        "id": "N6",
        "type": "switch",
        "name": "سكينة N6",
        "x": 480,
        "y": 720,
        "direction": "horizontal",
        "state": "closed"
      },
      {
        "id": "N7",
        "type": "junction",
        "name": "مناول من خط",
        "x": 560,
        "y": 720
      },
      {
        "id": "N8",
        "type": "transformer",
        "name": "ولاد غانم",
        "capacity": 160,
        "loading_pct": 80,
        "x": 560,
        "y": 550,
        "direction": "up"
      },
      {
        "id": "N9",
        "type": "kiosk",
        "name": "محول تفريعة فرعية",
        "capacity": 100,
        "loading_pct": 65,
        "switches_count": 2,
        "x": 660,
        "y": 550,
        "direction": "right"
      },
      {
        "id": "N11",
        "type": "switch",
        "name": "سكينة N11",
        "x": 780,
        "y": 720,
        "direction": "vertical",
        "state": "closed"
      },
      {
        "id": "N12",
        "type": "junction",
        "name": "نقطة تفريع كابلات",
        "x": 780,
        "y": 830
      },
      {
        "id": "N13",
        "type": "kiosk",
        "name": "انارة ام الساس الدائري",
        "capacity": 200,
        "loading_pct": 60,
        "switches_count": 2,
        "x": 950,
        "y": 830,
        "direction": "right"
      },
      {
        "id": "N14",
        "type": "kiosk",
        "name": "ام الساس الوسط",
        "capacity": 200,
        "loading_pct": 75,
        "switches_count": 2,
        "x": 860,
        "y": 700,
        "direction": "right"
      },
      {
        "id": "N15",
        "type": "kiosk",
        "name": "مدرسة ام الساس",
        "capacity": 100,
        "loading_pct": 70,
        "switches_count": 1,
        "x": 1350,
        "y": 600,
        "direction": "up"
      }
    ],
    "sections": [
      {
        "id": "S1",
        "from_node": "N1",
        "to_node": "N2",
        "type": "كابل",
        "size": "3*240",
        "length": 152,
        "direction": "down"
      },
      {
        "id": "S2",
        "from_node": "N2",
        "to_node": "N3",
        "type": "هوائي",
        "size": "150/25",
        "length": 500,
        "direction": "down"
      },
      {
        "id": "S3",
        "from_node": "N3",
        "to_node": "N4",
        "type": "كابل",
        "size": "3*150",
        "length": 200,
        "direction": "left"
      },
      {
        "id": "S4",
        "from_node": "N3",
        "to_node": "N5",
        "type": "هوائي",
        "size": "150/25",
        "length": 6600,
        "direction": "down"
      },
      {
        "id": "S5",
        "from_node": "N5",
        "to_node": "N6",
        "type": "هوائي",
        "size": "35/6",
        "length": 1100,
        "direction": "right"
      },
      {
        "id": "S6",
        "from_node": "N6",
        "to_node": "N7",
        "type": "هوائي",
        "size": "35/6",
        "length": 100,
        "direction": "right"
      },
      {
        "id": "S7",
        "from_node": "N7",
        "to_node": "N8",
        "type": "هوائي",
        "size": "35/6",
        "length": 100,
        "direction": "up"
      },
      {
        "id": "S8",
        "from_node": "N8",
        "to_node": "N9",
        "type": "هوائي",
        "size": "35/6",
        "length": 200,
        "direction": "right"
      },
      {
        "id": "S9",
        "from_node": "N7",
        "to_node": "N11",
        "type": "هوائي",
        "size": "35/6",
        "length": 350,
        "direction": "right"
      },
      {
        "id": "S10",
        "from_node": "N11",
        "to_node": "N12",
        "type": "كابل",
        "size": "3*150",
        "length": 65,
        "direction": "down"
      },
      {
        "id": "S11",
        "from_node": "N12",
        "to_node": "N13",
        "type": "كابل",
        "size": "3*70",
        "length": 200,
        "direction": "right"
      },
      {
        "id": "S12",
        "from_node": "N12",
        "to_node": "N14",
        "type": "كابل",
        "size": "3*70",
        "length": 200,
        "direction": "up"
      },
      {
        "id": "S13",
        "from_node": "N12",
        "to_node": "N15",
        "type": "كابل",
        "size": "3*70",
        "length": 490,
        "direction": "right"
      }
    ]
  },
  {
    "id": "video_demo_feeder",
    "name": "مخطط شبكة التوزيع المعتمد (11 ك.ف)",
    "substation": "محطة محولات غرب",
    "voltage_kv": 11,
    "designer": "ENG-MOSTAFAELMGHRABY",
    "copyright": "جميع الحقوق محفوظة للمهندس مصطفى المغربي © ENG-MOSTAFAELMGHRABY",
    "nodes": [
      {
        "id": "N1",
        "type": "substation",
        "name": "محطة محولات",
        "x": 400,
        "y": 80
      },
      {
        "id": "N2",
        "type": "switch",
        "name": "سكينة هوائية N2",
        "x": 400,
        "y": 260,
        "direction": "vertical",
        "state": "closed"
      },
      {
        "id": "N3",
        "type": "switch",
        "name": "سكينة تفريعة N3",
        "x": 400,
        "y": 480,
        "direction": "horizontal",
        "state": "closed"
      },
      {
        "id": "N4",
        "type": "transformer",
        "name": "محول 1",
        "capacity": 100,
        "loading_pct": 78,
        "x": 650,
        "y": 480,
        "direction": "up"
      },
      {
        "id": "N5",
        "type": "transformer",
        "name": "محول 2",
        "capacity": 63,
        "loading_pct": 80,
        "x": 920,
        "y": 480,
        "direction": "up"
      },
      {
        "id": "N6",
        "type": "junction",
        "name": "نقطة تفريعة كشك 1",
        "x": 400,
        "y": 900
      },
      {
        "id": "N7",
        "type": "kiosk",
        "name": "كشك 1",
        "capacity": 500,
        "loading_pct": 62,
        "switches_count": 2,
        "x": 750,
        "y": 900,
        "direction": "up"
      },
      {
        "id": "N8",
        "type": "kiosk",
        "name": "كشك 2",
        "capacity": 300,
        "loading_pct": 70,
        "switches_count": 1,
        "x": 1050,
        "y": 900,
        "direction": "right"
      },
      {
        "id": "N9",
        "type": "switch",
        "name": "سكينة N9",
        "x": 400,
        "y": 1400,
        "direction": "vertical",
        "state": "closed"
      },
      {
        "id": "N10",
        "type": "rmu",
        "name": "لوحة RMU 1",
        "switches_count": 3,
        "x": 400,
        "y": 1650
      },
      {
        "id": "N11",
        "type": "kiosk",
        "name": "كشك 3",
        "capacity": 300,
        "loading_pct": 45,
        "switches_count": 1,
        "x": 400,
        "y": 1900,
        "direction": "down"
      }
    ],
    "sections": [
      {
        "id": "S1",
        "from_node": "N1",
        "to_node": "N2",
        "type": "كابل",
        "size": "3*300",
        "length": 1500,
        "direction": "down"
      },
      {
        "id": "S2",
        "from_node": "N2",
        "to_node": "N3",
        "type": "هوائي",
        "size": "150/25",
        "length": 2000,
        "direction": "down"
      },
      {
        "id": "S3",
        "from_node": "N3",
        "to_node": "N4",
        "type": "هوائي",
        "size": "70/12",
        "length": 800,
        "direction": "right"
      },
      {
        "id": "S4",
        "from_node": "N4",
        "to_node": "N5",
        "type": "هوائي",
        "size": "70/12",
        "length": 1200,
        "direction": "right"
      },
      {
        "id": "S5",
        "from_node": "N3",
        "to_node": "N6",
        "type": "هوائي",
        "size": "150/25",
        "length": 6000,
        "direction": "down"
      },
      {
        "id": "S6",
        "from_node": "N6",
        "to_node": "N7",
        "type": "كابل",
        "size": "3*240",
        "length": 3000,
        "direction": "right"
      },
      {
        "id": "S7",
        "from_node": "N7",
        "to_node": "N8",
        "type": "كابل",
        "size": "3*70",
        "length": 350,
        "direction": "right"
      },
      {
        "id": "S8",
        "from_node": "N6",
        "to_node": "N9",
        "type": "هوائي",
        "size": "70/12",
        "length": 8000,
        "direction": "down"
      },
      {
        "id": "S9",
        "from_node": "N9",
        "to_node": "N10",
        "type": "كابل",
        "size": "3*240",
        "length": 1200,
        "direction": "down"
      },
      {
        "id": "S10",
        "from_node": "N10",
        "to_node": "N11",
        "type": "كابل",
        "size": "3*150",
        "length": 300,
        "direction": "down"
      }
    ]
  }
];
