/**
 * Smart Grid SLD Studio - Electrical Symbols & Components Library
 * Copyright (C) ENG-MOSTAFAELMGHRABY - All Rights Reserved
 */

const Components = {

  // رسم محطة المحولات: 3 دوائر متداخلة على شكل مثلث مثل المحول ثلاثي الأطوار
  renderSubstation(node, isSelected = false) {
    const x = node.x;
    const y = node.y;
    const selClass = isSelected ? "sld-selected" : "";
    const name = node.name || "محطة محولات";
    
    // إذا كان نوع العقدة لوحة توزيع (switchboard)
    if (node.subType === "board" || (node.name && node.name.includes("لوحة"))) {
      return `
        <g class="sld-node-group ${selClass}" id="node-${node.id}" transform="translate(${x}, ${y})" onclick="handleNodeClick(event, '${node.id}')" ondblclick="handleNodeDblClick(event, '${node.id}')">
          <rect x="-70" y="-25" width="140" height="46" rx="4" fill="#1A202C" stroke="#2B6CB0" stroke-width="2.5" />
          <rect x="-65" y="-20" width="130" height="36" rx="2" fill="#161B22" stroke="#63B3ED" stroke-width="1.2" />
          <text x="0" y="-1" text-anchor="middle" class="sld-badge-text" fill="#FFFFFF" font-size="11" font-weight="bold">${name}</text>
          <rect x="-16" y="23" width="32" height="15" class="sld-node-tag" />
          <text x="0" y="34" text-anchor="middle" class="sld-badge-text" fill="#FFFFFF">${node.id}</text>
        </g>
      `;
    }

    // محطة محولات: 3 دوائر متداخلة على شكل مثلث (Delta Formation)
    return `
      <g class="sld-node-group ${selClass}" id="node-${node.id}" transform="translate(${x}, ${y})" onclick="handleNodeClick(event, '${node.id}')" ondblclick="handleNodeDblClick(event, '${node.id}')">
        <!-- الدائرة العلوية -->
        <circle cx="0" cy="-14" r="14" fill="none" stroke="#63B3ED" stroke-width="2.5" />
        <!-- الدائرة السفلية اليسرى -->
        <circle cx="-12" cy="7" r="14" fill="none" stroke="#63B3ED" stroke-width="2.5" />
        <!-- الدائرة السفلية اليمنى -->
        <circle cx="12" cy="7" r="14" fill="none" stroke="#63B3ED" stroke-width="2.5" />
        <!-- نقطة التوصيل المركزية -->
        <circle cx="0" cy="0" r="3" fill="#63B3ED" />
        <!-- اسم المحطة -->
        <rect x="-55" y="-48" width="110" height="18" rx="4" fill="#1A202C" stroke="#4A5568" stroke-width="1" />
        <text x="0" y="-35" text-anchor="middle" class="sld-badge-text" fill="#90CDF4" font-size="11">${name}</text>
        <!-- شارة النود -->
        <rect x="-18" y="26" width="36" height="16" class="sld-node-tag" />
        <text x="0" y="38" text-anchor="middle" class="sld-badge-text" fill="#FFFFFF">${node.id}</text>
      </g>
    `;
  },

  // دالة مساعدة لحساب اتجاه السكينة بدقة هندسية ومطابقة مسار الخط (يسار، يمين، أسفل، أعلى)
  getSwitchDirection(node) {
    if (node.dir && ["left", "right", "down", "up"].includes(node.dir)) {
      return node.dir;
    }
    // إذا كان نوع الاتجاه مسجلاً كأفقي
    if (node.direction === "horizontal") {
      if (typeof currentProject !== "undefined" && currentProject && currentProject.sections) {
        const sec = currentProject.sections.find(s => s.from_node === node.id || s.to_node === node.id);
        if (sec && (sec.direction === "left" || sec.direction === "right")) return sec.direction;
      }
      return "right";
    }
    // فحص المقاطع المتصلة لتحديد الاتجاه التلقائي بدقة
    if (typeof currentProject !== "undefined" && currentProject && currentProject.sections) {
      // 1. فحص الخط الخارج من السكينة أولاً (المسار المحكوم بها)
      const outgoingSec = currentProject.sections.find(s => s.from_node === node.id);
      if (outgoingSec) {
        if (outgoingSec.direction) return outgoingSec.direction;
        const toNode = currentProject.nodes.find(n => n.id === outgoingSec.to_node);
        if (toNode) {
          const dx = toNode.x - node.x;
          const dy = toNode.y - node.y;
          if (Math.abs(dx) >= Math.abs(dy)) {
            return dx < 0 ? "left" : "right";
          } else {
            return dy < 0 ? "up" : "down";
          }
        }
      }
      // 2. فحص الخط الداخل إلى السكينة
      const incomingSec = currentProject.sections.find(s => s.to_node === node.id);
      if (incomingSec) {
        if (incomingSec.direction) return incomingSec.direction;
        const fromNode = currentProject.nodes.find(n => n.id === incomingSec.from_node);
        if (fromNode) {
          const dx = node.x - fromNode.x;
          const dy = node.y - fromNode.y;
          if (Math.abs(dx) >= Math.abs(dy)) {
            return dx < 0 ? "left" : "right";
          } else {
            return dy < 0 ? "up" : "down";
          }
        }
      }
    }
    return "down";
  },

  // رسم السكينة الهوائية: تبدأ من الخط المستقيم تماماً بدون قطعه أو قسمه
  // مع استمرار الخط الرأسي سليماً ومباشراً للأسفل
  renderSwitch(node, isEnergized = true, isSelected = false, isSimulationMode = false) {
    const x = node.x;
    const y = node.y;
    const isClosed = (node.state !== "open");
    const dir = this.getSwitchDirection(node);
    const isHoriz = (dir === "left" || dir === "right");
    const strokeColor = isEnergized ? (isClosed ? "#48BB78" : "#E53E3E") : "#718096";
    const selClass = isSelected ? "sld-selected" : "";
    const simClass = isSimulationMode ? "sim-switch-interactive" : "";

    const SW_LEN = 32; // طول سيف السكينة بالبيكسل
    let bladeMarkup = "";
    let p1x = 0, p1y = 0, p2x = 0, p2y = 0;

    if (dir === "left") {
      // السكينة تبدأ من الخط المستقيم تماماً عند (0, 0) وتمتد يساراً نحو (-32, 0)
      // بدون أي بروز لليمين، ليبقى الخط الرأسي مستقيماً وسليماً 100%
      p1x = 0; p1y = 0;
      p2x = -SW_LEN; p2y = 0;
      if (isClosed) {
        bladeMarkup = `
          <line x1="0" y1="0" x2="-${SW_LEN}" y2="0" stroke="${strokeColor}" stroke-width="2.8" stroke-linecap="round" />
          <line x1="-${SW_LEN}" y1="0" x2="-${SW_LEN - 5}" y2="-6" stroke="${strokeColor}" stroke-width="2.2" stroke-linecap="round" />
        `;
      } else {
        bladeMarkup = `
          <line x1="0" y1="0" x2="-22" y2="-15" stroke="${strokeColor}" stroke-width="2.8" stroke-linecap="round" />
          <circle cx="-22" cy="-15" r="2.2" fill="${strokeColor}" />
        `;
      }
    } else if (dir === "right") {
      // السكينة تبدأ من الخط المستقيم تماماً عند (0, 0) وتمتد يميناً نحو (+32, 0)
      // بدون أي بروز لليسار، ليبقى الخط الرأسي مستقيماً وسليماً 100%
      p1x = 0; p1y = 0;
      p2x = SW_LEN; p2y = 0;
      if (isClosed) {
        bladeMarkup = `
          <line x1="0" y1="0" x2="${SW_LEN}" y2="0" stroke="${strokeColor}" stroke-width="2.8" stroke-linecap="round" />
          <line x1="${SW_LEN}" y1="0" x2="${SW_LEN - 5}" y2="-6" stroke="${strokeColor}" stroke-width="2.2" stroke-linecap="round" />
        `;
      } else {
        bladeMarkup = `
          <line x1="0" y1="0" x2="22" y2="-15" stroke="${strokeColor}" stroke-width="2.8" stroke-linecap="round" />
          <circle cx="22" cy="-15" r="2.2" fill="${strokeColor}" />
        `;
      }
    } else if (dir === "up") {
      // السكينة تبدأ من الخط المستقيم تماماً عند (0, 0) وتمتد لأعلى نحو (0, -32)
      p1x = 0; p1y = 0;
      p2x = 0; p2y = -SW_LEN;
      if (isClosed) {
        bladeMarkup = `
          <line x1="0" y1="0" x2="0" y2="-${SW_LEN}" stroke="${strokeColor}" stroke-width="2.8" stroke-linecap="round" />
          <line x1="0" y1="-${SW_LEN}" x2="6" y2="-${SW_LEN - 5}" stroke="${strokeColor}" stroke-width="2.2" stroke-linecap="round" />
        `;
      } else {
        bladeMarkup = `
          <line x1="0" y1="0" x2="15" y2="-22" stroke="${strokeColor}" stroke-width="2.8" stroke-linecap="round" />
          <circle cx="15" cy="-22" r="2.2" fill="${strokeColor}" />
        `;
      }
    } else { // "down"
      // السكينة تبدأ من الخط المستقيم تماماً عند (0, 0) وتمتد لأسفل نحو (0, +32)
      p1x = 0; p1y = 0;
      p2x = 0; p2y = SW_LEN;
      if (isClosed) {
        bladeMarkup = `
          <line x1="0" y1="0" x2="0" y2="${SW_LEN}" stroke="${strokeColor}" stroke-width="2.8" stroke-linecap="round" />
          <line x1="0" y1="${SW_LEN}" x2="6" y2="${SW_LEN - 5}" stroke="${strokeColor}" stroke-width="2.2" stroke-linecap="round" />
        `;
      } else {
        bladeMarkup = `
          <line x1="0" y1="0" x2="15" y2="22" stroke="${strokeColor}" stroke-width="2.8" stroke-linecap="round" />
          <circle cx="15" cy="22" r="2.2" fill="${strokeColor}" />
        `;
      }
    }

    // فحص اتجاهات الخطوط المتصلة بالسكينة لتفادي وضع النصوص على مسار أي خط متصل أو سيف السكينة
    let hasLineRight = false, hasLineLeft = false, hasLineUp = false, hasLineDown = false;
    if (typeof currentProject !== "undefined" && currentProject && currentProject.sections) {
      currentProject.sections.forEach(sec => {
        let otherId = null;
        if (sec.from_node === node.id) otherId = sec.to_node;
        else if (sec.to_node === node.id) otherId = sec.from_node;

        if (otherId) {
          const other = currentProject.nodes.find(n => n.id === otherId);
          if (other) {
            const dx = other.x - node.x;
            const dy = other.y - node.y;
            if (Math.abs(dx) >= Math.abs(dy)) {
              if (dx > 25) hasLineRight = true;
              else if (dx < -25) hasLineLeft = true;
            } else {
              if (dy > 25) hasLineDown = true;
              else if (dy < -25) hasLineUp = true;
            }
          }
        }
      });
    }

    // حساب الموضع الذكي والمنظم لمسميات السكينة (اسم السكينة ورقم النود)
    // إبعاد المسميات عن الخط والسكينة بحيث تكون بحذاء السكينة ومنعزلة بمسافة واضحة
    const midBladeX = (p1x + p2x) / 2;
    const midBladeY = (p1y + p2y) / 2;
    let labelX = 0, labelY = 0;

    if (!isHoriz) {
      // سكينة رأسية: المسمى يوضع بحذاء السكينة (يميناً أو يساراً بمسافة 52px عن محور الخط)
      labelY = midBladeY;
      if (node.label_position === "right" || (hasLineLeft && !hasLineRight)) {
        labelX = 52;
      } else {
        labelX = -52;
      }
    } else {
      // سكينة أفقية: المسمى يوضع بحذاء السكينة (أعلى أو أسفل الخط بمسافة 44px عن مسار الخط)
      labelX = midBladeX;
      if (node.label_position === "above" || (hasLineDown && !hasLineUp)) {
        labelY = -44;
      } else {
        labelY = 44;
      }
    }

    // تظليل النود والسكينة في وضع المحاكاة للضغط عليه بوضوح وجاذبية
    let simHighlightMarkup = "";
    if (isSimulationMode) {
      const glowColor = isClosed ? "#48BB78" : "#E53E3E";
      const glowBg = isClosed ? "rgba(72, 187, 120, 0.25)" : "rgba(229, 62, 62, 0.25)";

      let badgeX = midBladeX;
      let badgeY = -34;
      if (!isHoriz) {
        if (hasLineUp && !hasLineDown) badgeY = 36;
        else if (hasLineUp && hasLineDown) {
          badgeX = (labelX < 0) ? 46 : -46;
          badgeY = 16;
        }
      } else {
        if (hasLineUp && !hasLineDown) badgeY = 36;
        else if (!hasLineUp && hasLineDown) badgeY = -36;
      }

      simHighlightMarkup = `
        <!-- هالة التظليل والنبض للسكينة في وضع المحاكاة -->
        <circle cx="${midBladeX}" cy="${midBladeY}" r="28" fill="${glowBg}" stroke="${glowColor}" stroke-width="2" stroke-dasharray="5 3" class="sim-switch-pulse" />
        <!-- بادج تفاعلي يوضح النقر للفصل أو التوصيل -->
        <g transform="translate(${badgeX}, ${badgeY})" style="filter: drop-shadow(0 2px 5px rgba(0,0,0,0.8)); pointer-events: none;">
          <rect x="-42" y="-10" width="84" height="20" rx="10" fill="${isClosed ? '#1C4532' : '#742A2A'}" stroke="${glowColor}" stroke-width="1.6" />
          <text x="0" y="4" text-anchor="middle" fill="#FFFFFF" font-size="10" font-weight="bold">${isClosed ? '🟢 انقر للفصل' : '🔴 انقر للتوصيل'}</text>
        </g>
      `;
    }

    return `
      <g class="sld-node-group sld-switch-interactive ${simClass} ${selClass}" id="node-${node.id}" transform="translate(${x}, ${y})" onclick="handleNodeClick(event, '${node.id}')" ondblclick="handleNodeDblClick(event, '${node.id}')" style="cursor:pointer;">
        <!-- منطقة نقر عريضة تغطي مسار السكينة تضمن استجابة فورية بدون أي تفويت -->
        <circle cx="${midBladeX}" cy="${midBladeY}" r="30" fill="transparent" style="cursor:pointer; pointer-events:all;" />

        <!-- تظليل وضع المحاكاة -->
        ${simHighlightMarkup}

        <!-- قطبي التلامس الدائريين: القطب الأول يبدأ من الخط المستقيم مباشرة (0, 0) والطرف الثاني عند نهاية السيف -->
        <circle cx="${p1x}" cy="${p1y}" r="3.5" fill="#FFFFFF" stroke="${strokeColor}" stroke-width="2" />
        <circle cx="${p2x}" cy="${p2y}" r="3.5" fill="#FFFFFF" stroke="${strokeColor}" stroke-width="2" />

        <!-- سيف السكينة المفصلي -->
        ${bladeMarkup}

        <!-- بطاقة مسمى السكينة ورقم النود بحذاء السكينة وبعيدة بمسافة أمان عن الخط والسيف -->
        <g transform="translate(${labelX}, ${labelY})">
          <rect x="-42" y="-14" width="84" height="28" rx="4" class="sld-length-pill" style="fill:rgba(15,23,42,0.92); stroke:#4A5568; stroke-width:1px;" />
          <text x="0" y="-1" text-anchor="middle" class="sld-badge-text" fill="#FFFFFF" font-size="10" font-weight="bold">${node.name || 'سكينة'}</text>
          <text x="0" y="10" text-anchor="middle" class="sld-badge-text" fill="#90CDF4" font-size="9" font-weight="bold">${node.id}</text>
        </g>
        <title>سكينة ${node.name || node.id} (${isClosed ? 'مغلقة' : 'مفتوحة'}) - انقر للتبديل</title>
      </g>
    `;
  },

  // رسم المحول المعلق: مسميات منظمة ومرتبة رأسياً فوق بعضها بذكاء هندسي مثل الأكشاك بعيداً عن مسارات الكابلات والمحول
  renderTransformer(node, isEnergized = true, isSelected = false) {
    const x = node.x;
    const y = node.y;
    const dir = node.direction || "up";
    const strokeColor = isEnergized ? "#48BB78" : "#718096";
    const cap = node.capacity || 100;
    const loadPct = node.loading_pct || 75;
    const selClass = isSelected ? "sld-selected" : "";

    let connLine = "";
    let c1x = 0, c1y = 0, c2x = 0, c2y = 0;

    if (dir === "left") {
      connLine = `<line x1="0" y1="0" x2="-18" y2="0" stroke="${strokeColor}" stroke-width="2" />`;
      c1x = -26; c1y = 0; c2x = -40; c2y = 0;
    } else if (dir === "right") {
      connLine = `<line x1="0" y1="0" x2="18" y2="0" stroke="${strokeColor}" stroke-width="2" />`;
      c1x = 26; c1y = 0; c2x = 40; c2y = 0;
    } else if (dir === "down") {
      connLine = `<line x1="0" y1="0" x2="0" y2="18" stroke="${strokeColor}" stroke-width="2" />`;
      c1x = 0; c1y = 26; c2x = 0; c2y = 40;
    } else { // up
      connLine = `<line x1="0" y1="0" x2="0" y2="-18" stroke="${strokeColor}" stroke-width="2" />`;
      c1x = 0; c1y = -26; c2x = 0; c2y = -40;
    }

    // فحص اتجاهات الكابلات والخطوط المتصلة بالمحول لتفادي وضع النصوص على مسار أي خط متصل
    let hasLineRight = false, hasLineLeft = false, hasLineUp = false, hasLineDown = false;
    if (typeof currentProject !== "undefined" && currentProject && currentProject.sections) {
      currentProject.sections.forEach(sec => {
        let otherId = null;
        if (sec.from_node === node.id) otherId = sec.to_node;
        else if (sec.to_node === node.id) otherId = sec.from_node;

        if (otherId) {
          const other = currentProject.nodes.find(n => n.id === otherId);
          if (other) {
            const dx = other.x - node.x;
            const dy = other.y - node.y;
            if (Math.abs(dx) >= Math.abs(dy)) {
              if (dx > 30) hasLineRight = true;
              else if (dx < -30) hasLineLeft = true;
            } else {
              if (dy > 30) hasLineDown = true;
              else if (dy < -30) hasLineUp = true;
            }
          }
        }
      });
    }

    // حساب موضع وأبعاد اليفطة الصغيرة الأنيقة للمحول (منع الطمس والتداخل نهائياً)
    const name = node.name || "محول";
    const capText = loadPct ? `${cap} KVA (${loadPct}%)` : `${cap} KVA`;
    const charCount = Math.max(name.length, (capText + " (" + node.id + ")").length);
    const boxW = Math.max(72, Math.min(126, charCount * 6.8 + 16));
    const boxH = 30; // يفطة صغيرة وأنيقة جداً

    let placardX = 0, placardY = 0;
    const prefPos = node.label_position; // "right", "left", "above", "below"

    if (dir === "up") {
      // دوائر المحول تمتد من Y=-16 إلى Y=-50 وأفقياً بين X=[-10, 10]
      if (prefPos === "above") {
        placardX = 0;
        placardY = -50 - 9 - boxH / 2;
      } else if (prefPos === "left" || (hasLineRight && !hasLineLeft && prefPos !== "right")) {
        placardX = -10 - 10 - boxW / 2;
        placardY = -33;
      } else if (prefPos === "below") {
        placardX = 0;
        placardY = 8 + boxH / 2;
      } else {
        // يمين المحول (الموضع النموذجي المنعزل عن الدوائر بمسافة أمان)
        placardX = 10 + 10 + boxW / 2;
        placardY = -33;
      }
    } else if (dir === "down") {
      // دوائر المحول تمتد من Y=16 إلى Y=50 وأفقياً بين X=[-10, 10]
      if (prefPos === "below") {
        placardX = 0;
        placardY = 50 + 9 + boxH / 2;
      } else if (prefPos === "left" || (hasLineRight && !hasLineLeft && prefPos !== "right")) {
        placardX = -10 - 10 - boxW / 2;
        placardY = 33;
      } else if (prefPos === "above") {
        placardX = 0;
        placardY = -8 - boxH / 2;
      } else {
        placardX = 10 + 10 + boxW / 2;
        placardY = 33;
      }
    } else if (dir === "right") {
      // دوائر المحول تمتد من X=16 إلى X=50 ورأسياً بين Y=[-10, 10]
      if (prefPos === "right") {
        placardX = 50 + 10 + boxW / 2;
        placardY = 0;
      } else if (prefPos === "below" || (hasLineUp && !hasLineDown && prefPos !== "above")) {
        placardX = 33;
        placardY = 10 + 9 + boxH / 2;
      } else {
        placardX = 33;
        placardY = -10 - 9 - boxH / 2;
      }
    } else { // left
      // دوائر المحول تمتد من X=-16 إلى X=-50 ورأسياً بين Y=[-10, 10]
      if (prefPos === "left") {
        placardX = -50 - 10 - boxW / 2;
        placardY = 0;
      } else if (prefPos === "below" || (hasLineUp && !hasLineDown && prefPos !== "above")) {
        placardX = -33;
        placardY = 10 + 9 + boxH / 2;
      } else {
        placardX = -33;
        placardY = -10 - 9 - boxH / 2;
      }
    }

    return `
      <g class="sld-node-group ${selClass}" id="node-${node.id}" transform="translate(${x}, ${y})" onclick="handleNodeClick(event, '${node.id}')" ondblclick="handleNodeDblClick(event, '${node.id}')">
        <!-- نقطة التوصيل على الخط الرئيسي -->
        <circle cx="0" cy="0" r="3.5" fill="#FFFFFF" stroke="${strokeColor}" stroke-width="2" />
        ${connLine}
        <!-- دائرتا المحول المتداخلتان المعتمدتان -->
        <circle cx="${c1x}" cy="${c1y}" r="10" fill="url(#trans-grad)" stroke="${strokeColor}" stroke-width="2" />
        <circle cx="${c2x}" cy="${c2y}" r="10" fill="url(#trans-grad)" stroke="${strokeColor}" stroke-width="2" />

        <!-- يفطة بيانات المحول: صغيرة وأنيقة ومنعزلة بمسافة أمان تامة عن الدوائر ومسارات الخطوط -->
        <g class="sld-trans-placard sld-trans-label-group" transform="translate(${placardX}, ${placardY})">
          <rect x="${-boxW / 2}" y="${-boxH / 2}" width="${boxW}" height="${boxH}" rx="4" class="sld-placard-bg" style="fill:rgba(15,23,42,0.92); stroke:#16A34A; stroke-width:1.2px; filter:drop-shadow(0 1.5px 3px rgba(0,0,0,0.45));" />
          <line x1="${-boxW / 2 + 5}" y1="${-boxH / 2}" x2="${boxW / 2 - 5}" y2="${-boxH / 2}" stroke="#4ADE80" stroke-width="2.2" stroke-linecap="round" />
          <text x="0" y="-3" text-anchor="middle" class="sld-placard-title sld-transformer-name" fill="#FFFFFF" font-size="10.5" font-weight="bold">${name}</text>
          <text x="0" y="9" text-anchor="middle" class="sld-placard-sub sld-transformer-cap" fill="#ECC94B" font-size="9.5" font-weight="bold">
            ${capText} <tspan fill="#90CDF4" font-weight="bold" font-size="8.5">(${node.id})</tspan>
          </text>
        </g>
      </g>
    `;
  },

  // رسم كشك المحولات المعتمد هندسياً: مسميات مرتبة رأسياً فوق بعضها بذكاء هندسي بعيداً عن الكشك ومسارات امتداد الكابلات
  renderKiosk(node, isEnergized = true, isSelected = false) {
    const x = node.x;
    const y = node.y;
    // لون الكشك الهندسي المعتمد في المخطط القياسي: أزرق كابلات الجهد المتوسط (#1E88E5) كما في صورة نظام وضع الاكشاك
    const strokeColor = isEnergized ? "#1E88E5" : "#718096";
    const cap = node.capacity || 200;
    const dir = node.direction || "up";
    const selClass = isSelected ? "sld-selected" : "";

    // فحص هل الكشك حلقي (دخول وخروج متتالي بكابلين كما في كشك ام الساس الوسط) أو طرفي (محول فقط)
    let hasTakeoff = false;
    if (node.has_outgoing !== undefined) {
      hasTakeoff = !!node.has_outgoing;
    }
    if (typeof currentProject !== "undefined" && currentProject && currentProject.sections) {
      const outgoing = currentProject.sections.filter(s => s.from_node === node.id);
      if (outgoing.length > 0) {
        hasTakeoff = true;
      }
    }

    // رسم جسم الكشك المثلثي ونقاط التوصيل المعتمدة هندسياً:
    let triangleMarkup = "";
    let connStemMarkup = "";

    if (dir === "right") {
      triangleMarkup = `
        <polygon points="16,-14 44,0 16,14" fill="#FFFFFF" stroke="${strokeColor}" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round" />
      `;
      if (hasTakeoff) {
        // عند الأخذ من الكشك: نقطتان (نقطة دخول من أعلى ونقطة خروج من أسفل)
        connStemMarkup = `
          <!-- نقطة دخول علوية -->
          <line x1="0" y1="-8" x2="16" y2="-8" stroke="${strokeColor}" stroke-width="2.4" stroke-linecap="round" />
          <circle cx="0" cy="-8" r="3.2" fill="#FFFFFF" stroke="${strokeColor}" stroke-width="2" />
          <circle cx="16" cy="-8" r="2.2" fill="${strokeColor}" />
          <!-- نقطة خروج سفلية -->
          <line x1="0" y1="8" x2="16" y2="8" stroke="${strokeColor}" stroke-width="2.4" stroke-linecap="round" />
          <circle cx="0" cy="8" r="3.2" fill="#FFFFFF" stroke="${strokeColor}" stroke-width="2" />
          <circle cx="16" cy="8" r="2.2" fill="${strokeColor}" />
        `;
      } else {
        // إذا لم يكن هناك خروج من الكشك: نقطة واحدة فقط في الوسط
        connStemMarkup = `
          <line x1="0" y1="0" x2="16" y2="0" stroke="${strokeColor}" stroke-width="2.4" stroke-linecap="round" />
          <circle cx="0" cy="0" r="3.2" fill="#FFFFFF" stroke="${strokeColor}" stroke-width="2" />
          <circle cx="16" cy="0" r="2.6" fill="${strokeColor}" />
        `;
      }
    } else if (dir === "up") {
      triangleMarkup = `
        <polygon points="-14,-16 0,-44 14,-16" fill="#FFFFFF" stroke="${strokeColor}" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round" />
      `;
      if (hasTakeoff) {
        // عند الأخذ من الكشك: نقطتان من أسفل الكشك (نقطة دخول ونقطة خروج)
        connStemMarkup = `
          <!-- نقطة دخول (يسار) -->
          <line x1="-8" y1="0" x2="-8" y2="-16" stroke="${strokeColor}" stroke-width="2.4" stroke-linecap="round" />
          <circle cx="-8" cy="0" r="3.2" fill="#FFFFFF" stroke="${strokeColor}" stroke-width="2" />
          <circle cx="-8" cy="-16" r="2.2" fill="${strokeColor}" />
          <!-- نقطة خروج (يمين) -->
          <line x1="8" y1="0" x2="8" y2="-16" stroke="${strokeColor}" stroke-width="2.4" stroke-linecap="round" />
          <circle cx="8" cy="0" r="3.2" fill="#FFFFFF" stroke="${strokeColor}" stroke-width="2" />
          <circle cx="8" cy="-16" r="2.2" fill="${strokeColor}" />
        `;
      } else {
        // إذا لم يكن هناك خروج من الكشك: نقطة واحدة فقط في الوسط
        connStemMarkup = `
          <line x1="0" y1="0" x2="0" y2="-16" stroke="${strokeColor}" stroke-width="2.4" stroke-linecap="round" />
          <circle cx="0" cy="0" r="3.2" fill="#FFFFFF" stroke="${strokeColor}" stroke-width="2" />
          <circle cx="0" cy="-16" r="2.6" fill="${strokeColor}" />
        `;
      }
    } else if (dir === "down") {
      triangleMarkup = `
        <polygon points="-14,16 0,44 14,16" fill="#FFFFFF" stroke="${strokeColor}" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round" />
      `;
      if (hasTakeoff) {
        // عند الأخذ من الكشك: نقطتان من أعلى الكشك (نقطة دخول ونقطة خروج)
        connStemMarkup = `
          <line x1="-8" y1="0" x2="-8" y2="16" stroke="${strokeColor}" stroke-width="2.4" stroke-linecap="round" />
          <circle cx="-8" cy="0" r="3.2" fill="#FFFFFF" stroke="${strokeColor}" stroke-width="2" />
          <circle cx="-8" cy="16" r="2.2" fill="${strokeColor}" />
          <line x1="8" y1="0" x2="8" y2="16" stroke="${strokeColor}" stroke-width="2.4" stroke-linecap="round" />
          <circle cx="8" cy="0" r="3.2" fill="#FFFFFF" stroke="${strokeColor}" stroke-width="2" />
          <circle cx="8" cy="16" r="2.2" fill="${strokeColor}" />
        `;
      } else {
        // نقطة واحدة فقط في الوسط
        connStemMarkup = `
          <line x1="0" y1="0" x2="0" y2="16" stroke="${strokeColor}" stroke-width="2.4" stroke-linecap="round" />
          <circle cx="0" cy="0" r="3.2" fill="#FFFFFF" stroke="${strokeColor}" stroke-width="2" />
          <circle cx="0" cy="16" r="2.6" fill="${strokeColor}" />
        `;
      }
    } else { // left
      triangleMarkup = `
        <polygon points="-16,-14 -44,0 -16,14" fill="#FFFFFF" stroke="${strokeColor}" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round" />
      `;
      if (hasTakeoff) {
        // عند الأخذ من الكشك: نقطتان (نقطة دخول ونقطة خروج)
        connStemMarkup = `
          <line x1="0" y1="-8" x2="-16" y2="-8" stroke="${strokeColor}" stroke-width="2.4" stroke-linecap="round" />
          <circle cx="0" cy="-8" r="3.2" fill="#FFFFFF" stroke="${strokeColor}" stroke-width="2" />
          <circle cx="-16" cy="-8" r="2.2" fill="${strokeColor}" />
          <line x1="0" y1="8" x2="-16" y2="8" stroke="${strokeColor}" stroke-width="2.4" stroke-linecap="round" />
          <circle cx="0" cy="8" r="3.2" fill="#FFFFFF" stroke="${strokeColor}" stroke-width="2" />
          <circle cx="-16" cy="8" r="2.2" fill="${strokeColor}" />
        `;
      } else {
        // نقطة واحدة فقط في الوسط
        connStemMarkup = `
          <line x1="0" y1="0" x2="-16" y2="0" stroke="${strokeColor}" stroke-width="2.4" stroke-linecap="round" />
          <circle cx="0" cy="0" r="3.2" fill="#FFFFFF" stroke="${strokeColor}" stroke-width="2" />
          <circle cx="-16" cy="0" r="2.6" fill="${strokeColor}" />
        `;
      }
    }

    // حساب موضع وأبعاد اليفطة الصغيرة الأنيقة للكشك (إظهار KVA ومنع طمس أو تداخل النصوص نهائياً)
    const name = node.name || "كشك";
    const capText = `${cap} KVA`;
    const charCount = Math.max(name.length, (capText + " (" + node.id + ")").length);
    const boxW = Math.max(72, Math.min(124, charCount * 6.8 + 16));
    const boxH = 30; // ارتفاع اليفطة أنيق وصغير جداً

    // فحص اتجاهات الكابلات والخطوط المتصلة بالكشك لتفادي وضع اليفطة على مسار أي كابل متصل
    let hasLineRight = false, hasLineLeft = false, hasLineUp = false, hasLineDown = false;
    if (typeof currentProject !== "undefined" && currentProject && currentProject.sections) {
      currentProject.sections.forEach(sec => {
        let otherId = null;
        if (sec.from_node === node.id) otherId = sec.to_node;
        else if (sec.to_node === node.id) otherId = sec.from_node;

        if (otherId) {
          const other = currentProject.nodes.find(n => n.id === otherId);
          if (other) {
            const dx = other.x - node.x;
            const dy = other.y - node.y;
            if (Math.abs(dx) >= Math.abs(dy)) {
              if (dx > 25) hasLineRight = true;
              else if (dx < -25) hasLineLeft = true;
            } else {
              if (dy > 25) hasLineDown = true;
              else if (dy < -25) hasLineUp = true;
            }
          }
        }
      });
    }

    let placardX = 0, placardY = 0;
    const prefPos = node.label_position; // "right", "left", "above", "below"

    if (dir === "up") {
      // المثلث رأسه عند Y=-44 وقاعدته عند Y=-16 وأطرافه بين X=[-14, 14]
      if (prefPos === "above" || (!hasLineUp && prefPos === "above")) {
        placardX = 0;
        placardY = -44 - 9 - boxH / 2; // يبتعد 9px عن رأس المثلث
      } else if (prefPos === "left" || (hasLineRight && !hasLineLeft && prefPos !== "right")) {
        // يسار الكشك
        placardX = -14 - 10 - boxW / 2;
        placardY = -30;
      } else if (prefPos === "below") {
        placardX = 0;
        placardY = 8 + boxH / 2;
      } else {
        // يمين الكشك (الموضع الهندسي المعتمد والأنظف)
        placardX = 14 + 10 + boxW / 2;
        placardY = -30;
      }
    } else if (dir === "down") {
      // المثلث رأسه عند Y=44 وقاعدته عند Y=16 وأطرافه بين X=[-14, 14]
      if (prefPos === "below" || (!hasLineDown && prefPos === "below")) {
        placardX = 0;
        placardY = 44 + 9 + boxH / 2;
      } else if (prefPos === "left" || (hasLineRight && !hasLineLeft && prefPos !== "right")) {
        placardX = -14 - 10 - boxW / 2;
        placardY = 30;
      } else if (prefPos === "above") {
        placardX = 0;
        placardY = -8 - boxH / 2;
      } else {
        // يمين الكشك
        placardX = 14 + 10 + boxW / 2;
        placardY = 30;
      }
    } else if (dir === "right") {
      // المثلث رأسه عند X=44 وقاعدته عند X=16 وأطرافه بين Y=[-14, 14]
      if (prefPos === "right") {
        placardX = 44 + 10 + boxW / 2;
        placardY = 0;
      } else if (prefPos === "below" || (hasLineUp && !hasLineDown && prefPos !== "above")) {
        placardX = 30;
        placardY = 14 + 9 + boxH / 2;
      } else {
        // أعلى الكشك
        placardX = 30;
        placardY = -14 - 9 - boxH / 2;
      }
    } else { // left
      // المثلث رأسه عند X=-44 وقاعدته عند X=-16 وأطرافه بين Y=[-14, 14]
      if (prefPos === "left") {
        placardX = -44 - 10 - boxW / 2;
        placardY = 0;
      } else if (prefPos === "below" || (hasLineUp && !hasLineDown && prefPos !== "above")) {
        placardX = -30;
        placardY = 14 + 9 + boxH / 2;
      } else {
        // أعلى الكشك
        placardX = -30;
        placardY = -14 - 9 - boxH / 2;
      }
    }

    return `
      <g class="sld-node-group ${selClass}" id="node-${node.id}" transform="translate(${x}, ${y})" onclick="handleNodeClick(event, '${node.id}')" ondblclick="handleNodeDblClick(event, '${node.id}')">
        <!-- وصلة نقطة الدليل على مسار الخط كما كانت -->
        ${connStemMarkup}

        <!-- جسم الكشك المثلثي المعتمد في المخطط (نظام وضع الاكشاك) -->
        ${triangleMarkup}

        <!-- يفطة بيانات الكشك: صغيرة وأنيقة وتظهر KVA صراحة ومنعزلة بمسافة أمان تامة عن جسم الكشك ومسارات الكابلات -->
        <g class="sld-kiosk-placard sld-kiosk-label-group" transform="translate(${placardX}, ${placardY})">
          <rect x="${-boxW / 2}" y="${-boxH / 2}" width="${boxW}" height="${boxH}" rx="4" class="sld-placard-bg" style="fill:rgba(15,23,42,0.92); stroke:#1E88E5; stroke-width:1.2px; filter:drop-shadow(0 1.5px 3px rgba(0,0,0,0.45));" />
          <line x1="${-boxW / 2 + 5}" y1="${-boxH / 2}" x2="${boxW / 2 - 5}" y2="${-boxH / 2}" stroke="#60A5FA" stroke-width="2.2" stroke-linecap="round" />
          <text x="0" y="-3" text-anchor="middle" class="sld-placard-title sld-kiosk-name" fill="#FFFFFF" font-size="10.5" font-weight="bold">${name}</text>
          <text x="0" y="9" text-anchor="middle" class="sld-placard-sub sld-kiosk-cap" fill="#ECC94B" font-size="9.5" font-weight="bold">
            ${capText} <tspan fill="#90CDF4" font-weight="bold" font-size="8.5">(${node.id})</tspan>
          </text>
        </g>
      </g>
    `;
  },

  // رسم وحدة الربط الحلقي RMU: مربع بداخله × وتوصيل حلقي حسب الاتجاه وبدون كابلات
  renderRMU(node, isEnergized = true, isSelected = false) {
    const x = node.x;
    const y = node.y;
    const dir = node.direction || "down";
    const isHoriz = (dir === "right" || dir === "left");
    const strokeColor = isEnergized ? "#4299E1" : "#718096";
    const switches = node.switches_count || 3;
    const selClass = isSelected ? "sld-selected" : "";

    // خطوط ونقاط الربط الحلقي المباشر حسب الاتجاه (رأسي أو أفقي)
    let ringTerminals = "";
    if (isHoriz) {
      ringTerminals = `
        <line x1="-30" y1="0" x2="-18" y2="0" stroke="${strokeColor}" stroke-width="3" />
        <line x1="18" y1="0" x2="30" y2="0" stroke="${strokeColor}" stroke-width="3" />
        <circle cx="-30" cy="0" r="3.5" fill="#FFFFFF" stroke="${strokeColor}" stroke-width="2" />
        <circle cx="30" cy="0" r="3.5" fill="#FFFFFF" stroke="${strokeColor}" stroke-width="2" />
      `;
    } else {
      ringTerminals = `
        <line x1="0" y1="-30" x2="0" y2="-18" stroke="${strokeColor}" stroke-width="3" />
        <line x1="0" y1="18" x2="0" y2="30" stroke="${strokeColor}" stroke-width="3" />
        <circle cx="0" cy="-30" r="3.5" fill="#FFFFFF" stroke="${strokeColor}" stroke-width="2" />
        <circle cx="0" cy="30" r="3.5" fill="#FFFFFF" stroke="${strokeColor}" stroke-width="2" />
      `;
    }

    return `
      <g class="sld-node-group ${selClass}" id="node-${node.id}" transform="translate(${x}, ${y})" onclick="handleNodeClick(event, '${node.id}')" ondblclick="handleNodeDblClick(event, '${node.id}')">
        <!-- أطراف الربط الحلقي المباشر حسب الاتجاه -->
        ${ringTerminals}

        <!-- المربع الرئيسي لوحدة الربط الحلقي RMU -->
        <rect x="-18" y="-18" width="36" height="36" rx="3" fill="#1A365D" stroke="${strokeColor}" stroke-width="2.5" />
        <!-- علامة × المتقاطعة بالداخل للربط الحلقي -->
        <line x1="-14" y1="-14" x2="14" y2="14" stroke="#FFFFFF" stroke-width="2.5" />
        <line x1="14" y1="-14" x2="-14" y2="14" stroke="#FFFFFF" stroke-width="2.5" />

        <!-- اسم وحدة RMU والربط الحلقي -->
        <rect x="${isHoriz ? -45 : 24}" y="${isHoriz ? -38 : -16}" width="90" height="16" rx="3" fill="#1A202C" stroke="#4299E1" stroke-width="1" />
        <text x="${isHoriz ? 0 : 69}" y="${isHoriz ? -26 : -4}" text-anchor="middle" class="sld-badge-text" fill="#90CDF4">${node.name || "RMU (ربط حلقي)"}</text>

        <!-- عدد سكاكين الخروج -->
        <text x="${isHoriz ? 0 : 69}" y="${isHoriz ? 28 : 12}" text-anchor="middle" class="sld-badge-text" fill="#A0AEC0" font-size="10">${switches} سكاكين خروج</text>
      </g>
    `;
  },

  // رسم منظم الجهد AVR: دائرة بها سهم موجَّه حسب الاتجاه، نقطتا توصيل من الجهتين مثل السكينة، الحمل بالأمبير، ولم تأخذ رقم نود
  renderAVR(node, isEnergized = true, isSelected = false) {
    const x = node.x;
    const y = node.y;
    const dir = node.direction || "down";
    const strokeColor = isEnergized ? "#ECC94B" : "#718096";
    const currentA = node.rated_amp || 200;
    const selClass = isSelected ? "sld-selected" : "";
    const isHoriz = (dir === "right" || dir === "left");

    // السهم الموجَّه داخل الدائرة حسب الاختيار
    let arrowMarkup = "";
    if (dir === "down") {
      arrowMarkup = `
        <line x1="0" y1="-9" x2="0" y2="9" stroke="${strokeColor}" stroke-width="2.5" />
        <polygon points="0,11 -5,4 5,4" fill="${strokeColor}" />
      `;
    } else if (dir === "up") {
      arrowMarkup = `
        <line x1="0" y1="9" x2="0" y2="-9" stroke="${strokeColor}" stroke-width="2.5" />
        <polygon points="0,-11 -5,-4 5,-4" fill="${strokeColor}" />
      `;
    } else if (dir === "left") {
      arrowMarkup = `
        <line x1="9" y1="0" x2="-9" y2="0" stroke="${strokeColor}" stroke-width="2.5" />
        <polygon points="-11,0 -4,-5 -4,5" fill="${strokeColor}" />
      `;
    } else { // right
      arrowMarkup = `
        <line x1="-9" y1="0" x2="9" y2="0" stroke="${strokeColor}" stroke-width="2.5" />
        <polygon points="11,0 4,-5 4,5" fill="${strokeColor}" />
      `;
    }

    // نقطتا التوصيل من الجهتين (نفس نظام السكينة الهوائية)
    let p1x = 0, p1y = 0, p2x = 0, p2y = 0;
    let connLines = "";
    if (isHoriz) {
      p1x = -24; p1y = 0;
      p2x = 24; p2y = 0;
      connLines = `
        <line x1="-24" y1="0" x2="-14" y2="0" stroke="${strokeColor}" stroke-width="2.5" />
        <line x1="14" y1="0" x2="24" y2="0" stroke="${strokeColor}" stroke-width="2.5" />
      `;
    } else {
      p1x = 0; p1y = -24;
      p2x = 0; p2y = 24;
      connLines = `
        <line x1="0" y1="-24" x2="0" y2="-14" stroke="${strokeColor}" stroke-width="2.5" />
        <line x1="0" y1="14" x2="0" y2="24" stroke="${strokeColor}" stroke-width="2.5" />
      `;
    }

    return `
      <g class="sld-node-group ${selClass}" id="node-${node.id}" transform="translate(${x}, ${y})" onclick="handleNodeClick(event, '${node.id}')" ondblclick="handleNodeDblClick(event, '${node.id}')">
        <!-- نقطتا التوصيل من الجهتين مثل نظام السكينة -->
        ${connLines}
        <circle cx="${p1x}" cy="${p1y}" r="3.5" fill="#FFFFFF" stroke="${strokeColor}" stroke-width="2" />
        <circle cx="${p2x}" cy="${p2y}" r="3.5" fill="#FFFFFF" stroke="${strokeColor}" stroke-width="2" />

        <!-- دائرة منظم الجهد الرئيسية -->
        <circle cx="0" cy="0" r="14" fill="#1A202C" stroke="${strokeColor}" stroke-width="2.5" />

        <!-- السهم الموجَّه حسب الاتجاه داخل الدائرة -->
        ${arrowMarkup}

        <!-- مسمى AVR بحذاء المنظم -->
        <text x="${isHoriz ? 0 : 28}" y="${isHoriz ? -20 : -4}" text-anchor="${isHoriz ? 'middle' : 'start'}" class="sld-badge-text" fill="#ECC94B" font-size="11" font-weight="bold">${node.name || "AVR"}</text>

        <!-- الحمل بالأمبير بوضوح تام وبدون رقم نود -->
        <rect x="${isHoriz ? -30 : 24}" y="${isHoriz ? 18 : 8}" width="60" height="18" rx="4" fill="#1A202C" stroke="${strokeColor}" stroke-width="1.2" />
        <text x="${isHoriz ? 0 : 54}" y="${isHoriz ? 31 : 21}" text-anchor="middle" class="sld-badge-text" fill="#F6E05E" font-size="11" font-weight="bold">${currentA} A</text>
      </g>
    `;
  },

  // رسم نقطة تفرع بسيطة / مناول / نقطة ربط مباشر قبل السكينة
  renderJunction(node, isEnergized = true, isSelected = false) {
    const x = node.x;
    const y = node.y;
    const selClass = isSelected ? "sld-selected" : "";
    const dotFill = isEnergized ? "#00F0FF" : "#718096";
    const tagBorder = isEnergized ? "#2B6CB0" : "#4A5568";
    return `
      <g class="sld-node-group ${selClass}" id="node-${node.id}" transform="translate(${x}, ${y})" onclick="handleNodeClick(event, '${node.id}')" ondblclick="handleNodeDblClick(event, '${node.id}')">
        <circle cx="0" cy="0" r="5" fill="${dotFill}" stroke="#FFFFFF" stroke-width="2" />
        <rect x="10" y="-10" width="32" height="16" class="sld-node-tag" style="stroke:${tagBorder}" />
        <text x="26" y="2" text-anchor="middle" class="sld-badge-text" fill="#FFFFFF">${node.id}</text>
        <title>نقطة ربط مباشر / تفريعة: ${node.name || node.id}</title>
      </g>
    `;
  },

  // حساب نقطة اتصال الكابل بشرطيات الكشك بدقة هندسية متماثلة ومستقيمة تماماً (ــــا  اـــ) أو بالخط الواحد مثل المحول
  getKioskTerminalOffset(node, isOutgoing = false, sec = null) {
    let hasTakeoff = false;
    if (node && node.has_outgoing !== undefined) {
      hasTakeoff = !!node.has_outgoing;
    }
    if (typeof currentProject !== "undefined" && currentProject && currentProject.sections) {
      const outgoing = currentProject.sections.filter(s => s.from_node === node.id);
      if (outgoing.length > 0) {
        hasTakeoff = true;
      }
    }

    const dir = (node && node.direction) || "right";
    const outTerm = (node && node.outgoing_terminal) || "bottom";

    // 1. كشك طرفي (محول فقط بدون خروج): نقطة اتصال واحدة فقط في الوسط على نقطة المسار
    if (!hasTakeoff) {
      return { dx: 0, dy: 0 };
    }

    // 2. كشك حلقي (هاخد من كشك لكشك آخر): نقطتان (نقطة دخول ونقطة خروج)
    // خيار المستخدم لنقطة الخروج: من أسفل (bottom) أو من أعلى (top)
    if (dir === "right") {
      if (outTerm === "top") {
        // خروج من أعلى القاعدة كحرف L مكمل لأعلى
        return isOutgoing ? { dx: 0, dy: -8 } : { dx: 0, dy: 8 };
      } else {
        // خروج من أسفل القاعدة (الافتراضي عند الصعود لمنع تقاطع الخطوط مع الخط القادم من أعلى)
        return isOutgoing ? { dx: 0, dy: 8 } : { dx: 0, dy: -8 };
      }
    } else if (dir === "left") {
      if (outTerm === "top") {
        return isOutgoing ? { dx: 0, dy: -8 } : { dx: 0, dy: 8 };
      } else {
        return isOutgoing ? { dx: 0, dy: 8 } : { dx: 0, dy: -8 };
      }
    } else if (dir === "up") {
      // أسفل الكشك: نقطتان على المحور الأفقي (دخول وخروج)
      if (outTerm === "top" || outTerm === "left") {
        return isOutgoing ? { dx: -8, dy: 0 } : { dx: 8, dy: 0 };
      } else {
        return isOutgoing ? { dx: 8, dy: 0 } : { dx: -8, dy: 0 };
      }
    } else { // down
      if (outTerm === "top" || outTerm === "left") {
        return isOutgoing ? { dx: -8, dy: 0 } : { dx: 8, dy: 0 };
      } else {
        return isOutgoing ? { dx: 8, dy: 0 } : { dx: -8, dy: 0 };
      }
    }
  },

  // حساب إحداثيات نقطة التوصيل الفعلية للعقدة (أطراف السكينة، أطراف الكشك، المحول، أو النود العادي)
  getTerminalPoint(node, isSource = true, sec = null) {
    if (!node) return { x: 0, y: 0 };

    // 1. إذا كانت العقدة كشك
    if (node.type === "kiosk") {
      let isOutgoing = isSource;
      if (typeof currentProject !== "undefined" && currentProject && currentProject.sections) {
        const totalConnected = currentProject.sections.filter(s => s.from_node === node.id || s.to_node === node.id);
        if (totalConnected.length <= 1 && !node.has_outgoing) {
          isOutgoing = false;
        }
      }
      const offset = this.getKioskTerminalOffset(node, isOutgoing, sec);
      return { x: node.x + offset.dx, y: node.y + offset.dy };
    }

    // 2. إذا كانت العقدة سكينة
    if (node.type === "switch") {
      const dir = this.getSwitchDirection(node);
      const isHorizSw = (dir === "left" || dir === "right");
      const SW_LEN = 32;

      // طرف بداية السكينة (على الخط المستقيم تماماً) والطرف الخارجي
      const pBase = { x: node.x, y: node.y };
      let pOut = { x: node.x, y: node.y };
      if (dir === "left") pOut = { x: node.x - SW_LEN, y: node.y };
      else if (dir === "right") pOut = { x: node.x + SW_LEN, y: node.y };
      else if (dir === "up") pOut = { x: node.x, y: node.y - SW_LEN };
      else pOut = { x: node.x, y: node.y + SW_LEN };

      // تحديد مسار المقطع (رأسي أم أفقي)
      let secDir = sec ? sec.direction : null;
      let otherNode = null;
      if (sec && typeof currentProject !== "undefined" && currentProject && currentProject.nodes) {
        const otherId = (sec.from_node === node.id) ? sec.to_node : sec.from_node;
        if (otherId) otherNode = currentProject.nodes.find(n => n.id === otherId);
      }

      if (!secDir && otherNode) {
        const dx = otherNode.x - node.x;
        const dy = otherNode.y - node.y;
        if (Math.abs(dx) > Math.abs(dy)) {
          secDir = dx > 0 ? "right" : "left";
        } else {
          secDir = dy > 0 ? "down" : "up";
        }
      }

      const isSecVert = (secDir === "down" || secDir === "up");
      const isSecHoriz = (secDir === "left" || secDir === "right");

      // أ) إذا كانت السكينة أفقية (يسار أو يمين):
      if (isHorizSw) {
        // أي مقطع رأسي (خط واصل من أعلى أو توصيل مباشر للأسفل) يمر مستقيماً بدون انقطاع عبر مركز النود
        if (isSecVert) {
          return pBase;
        }

        // تفريع مباشر قبل السكينة
        if (sec && (sec.tap_side === "before_switch" || sec.is_direct_tap)) {
          return pBase;
        }

        // المسار المحكوم بسيف السكينة
        if (isSource) {
          return pOut;
        } else {
          if ((dir === "left" && otherNode && otherNode.x < node.x) ||
              (dir === "right" && otherNode && otherNode.x > node.x)) {
            return pOut;
          }
          return pBase;
        }
      }

      // ب) إذا كانت السكينة رأسية (أسفل أو أعلى):
      if (!isHorizSw) {
        // أي مقطع أفقي يمر مستقيماً بدون انقطاع عبر مركز النود
        if (isSecHoriz) {
          return pBase;
        }

        // تفريع مباشر قبل السكينة
        if (sec && (sec.tap_side === "before_switch" || sec.is_direct_tap)) {
          return pBase;
        }

        if (isSource) {
          return pOut;
        } else {
          if ((dir === "down" && otherNode && otherNode.y > node.y) ||
              (dir === "up" && otherNode && otherNode.y < node.y)) {
            return pOut;
          }
          return pBase;
        }
      }

      return pBase;
    }

    // 3. المحول، المحطة، نقطة التفرع، RMU: نقطة التوصيل بالمركز (0, 0)
    return { x: node.x, y: node.y };
  },

  // رسم الخط أو الكابل: خطوط مستقيمة تماماً بدون أي ميلان أو انحناء مع تطابق تام لنقطة نهاية الكابل والنود والمحول
  renderSection(sec, fromNode, toNode, isEnergized = true, isSelected = false) {
    if (!fromNode || !toNode) return "";

    const startPt = this.getTerminalPoint(fromNode, true, sec);
    const endPt = this.getTerminalPoint(toNode, false, sec);

    let x1 = startPt.x;
    let y1 = startPt.y;
    let x2 = endPt.x;
    let y2 = endPt.y;

    // استقامة هندسية للخطوط شبه الرأسية أو شبه الأفقية (مع السماح بالخطوط المائلة كرقم ٧)
    if (Math.abs(x1 - x2) <= 15) {
      x2 = x1;
    }
    if (Math.abs(y1 - y2) <= 15) {
      y2 = y1;
    }

    const isCable = (sec.type === "كابل");
    const strokeClass = isEnergized ? "energized" : "de-energized";
    const typeClass = isCable ? "cable" : "overhead";
    const strokeColor = isSelected ? "#00F0FF" : (isEnergized ? (isCable ? "#4299E1" : "#48BB78") : "#718096");
    const selClass = isSelected ? "sld-selected" : "";
    const dashAttr = isCable ? 'stroke-dasharray="10 6"' : 'stroke-dasharray="none"';

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const isVertical = Math.abs(dy) > Math.abs(dx);
    const visualLength = isVertical ? Math.abs(dy) : Math.abs(dx);
    const defOffset = sec.deflection_offset || 0;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const isOrthogonalCable = (isCable || fromNode.type === "kiosk" || toNode.type === "kiosk" || sec.corner_style === "hv" || sec.corner_style === "vh") && 
                              (absDx > 12 && absDy > 12) && !sec.is_slanted;

    let pathD = "";
    let handleX = (x1 + x2) / 2;
    let handleY = (y1 + y2) / 2;
    let cornerX = null;
    let cornerY = null;

    if (defOffset === 0) {
      if (isOrthogonalCable) {
        // تحديد التوجيه بناءً على sec.corner_style أو الحالات الذكية الافتراضية
        let useHV = (sec.corner_style === "hv");
        let useVH = (sec.corner_style === "vh");

        if (!useHV && !useVH) {
          // أ) حالة التوصيل بين كشك وكشك آخر (Kiosk-to-Kiosk)
          if (fromNode.type === "kiosk" && toNode.type === "kiosk") {
            const toDir = toNode.direction || "right";
            if (toDir === "up") {
              const dropY = Math.max(y1 + 18, fromNode.y + 26);
              pathD = `M ${x1} ${y1} L ${x1} ${dropY} L ${x2} ${dropY} L ${x2} ${y2}`;
              handleX = (x1 + x2) / 2;
              handleY = dropY;
              cornerX = x1;
              cornerY = dropY;
            } else if (toDir === "left") {
              const x_bypass = Math.max(x1, x2) + 36;
              pathD = `M ${x1} ${y1} L ${x_bypass} ${y1} L ${x_bypass} ${y2} L ${x2} ${y2}`;
              handleX = (x_bypass + x2) / 2;
              handleY = y2;
              cornerX = x_bypass;
              cornerY = y2;
            } else {
              const x_bypass = Math.min(x1, x2) - 36;
              pathD = `M ${x1} ${y1} L ${x_bypass} ${y1} L ${x_bypass} ${y2} L ${x2} ${y2}`;
              handleX = (x_bypass + x2) / 2;
              handleY = y2;
              cornerX = x_bypass;
              cornerY = y2;
            }
          }
          // ب) كابل داخل إلى كشك قادماً من سكينة أو مسار أو نود (Switch / Feeder to Kiosk)
          else if (toNode.type === "kiosk") {
            const toDir = toNode.direction || "right";
            if (toDir === "up") {
              useHV = true;
            } else {
              useVH = true;
            }
          }
          // ج) كابل خارج من كشك إلى خط أو محول أو نقطة عادية
          else if (fromNode.type === "kiosk") {
            const fromDir = fromNode.direction || "right";
            const outTerm = fromNode.outgoing_terminal || "bottom";
            if (fromDir === "right" || !fromDir || fromDir === "left") {
              if (outTerm === "top") {
                useHV = true;
              } else {
                if (y2 < y1) {
                  const dropY = Math.max(y1 + 18, fromNode.y + 26);
                  pathD = `M ${x1} ${y1} L ${x1} ${dropY} L ${x2} ${dropY} L ${x2} ${y2}`;
                  handleX = (x1 + x2) / 2;
                  handleY = dropY;
                  cornerX = x1;
                  cornerY = dropY;
                } else {
                  useHV = true;
                }
              }
            } else {
              useVH = true;
            }
          } else {
            // مسار كابل متعامد عام حسب الامتداد الأكبر
            useHV = (absDx >= absDy);
            useVH = !useHV;
          }
        }

        // بناء المسار المتعامد بزاوية 90 درجة مع تحديد إحداثيات الزاوية القائمة بدقة
        if (!pathD) {
          if (useHV) {
            // أفقي ثم رأسي (الزاوية القائمة 90° عند x2, y1)
            pathD = `M ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y2}`;
            cornerX = x2;
            cornerY = y1;
            handleX = (x1 + x2) / 2;
            handleY = y1;
          } else {
            // رأسي ثم أفقي (الزاوية القائمة 90° عند x1, y2)
            pathD = `M ${x1} ${y1} L ${x1} ${y2} L ${x2} ${y2}`;
            cornerX = x1;
            cornerY = y2;
            handleX = x1;
            handleY = (y1 + y2) / 2;
          }
        }
      } else {
        pathD = `M ${x1} ${y1} L ${x2} ${y2}`;
      }
    } else if (!isVertical) {
      // انحراف خط أفقي لأعلى أو لأسفل (Horizontal Jog / Bypass)
      const spanX = Math.abs(dx);
      const margin = Math.max(25, Math.min(80, spanX * 0.22));
      const bx1 = (x1 < x2) ? (x1 + margin) : (x1 - margin);
      const bx2 = (x1 < x2) ? (x2 - margin) : (x2 + margin);
      const jogY = y1 + defOffset;

      pathD = `M ${x1} ${y1} L ${bx1} ${y1} L ${bx1} ${jogY} L ${bx2} ${jogY} L ${bx2} ${y2} L ${x2} ${y2}`;
      handleX = (bx1 + bx2) / 2;
      handleY = jogY;
    } else {
      // انحراف خط رأسي لليمين أو لليسار (Vertical Jog / Bypass)
      const spanY = Math.abs(dy);
      const margin = Math.max(25, Math.min(80, spanY * 0.22));
      const by1 = (y1 < y2) ? (y1 + margin) : (y1 - margin);
      const by2 = (y1 < y2) ? (y2 - margin) : (y2 + margin);
      const jogX = x1 + defOffset;

      pathD = `M ${x1} ${y1} L ${x1} ${by1} L ${jogX} ${by1} L ${jogX} ${by2} L ${x2} ${by2} L ${x2} ${y2}`;
      handleX = jogX;
      handleY = (by1 + by2) / 2;
    }

    // تحديد الاتجاه الفعلي للقطاع الحامل لبطاقة المسمى
    let activeIsVertical = isVertical;
    if (defOffset !== 0) {
      activeIsVertical = isVertical;
    } else if (isOrthogonalCable) {
      activeIsVertical = (handleX === x1 || handleX === x2);
    }

    // تحديد جهة ومستوى المسمى (Side & Tier)
    let labelSide = sec.labelSide || (sec._smartLabel ? sec._smartLabel.side : null);
    let labelTier = (sec._smartLabel ? sec._smartLabel.tier : 1) || 1;

    if (!labelSide) {
      if (!activeIsVertical) {
        labelSide = (defOffset > 0) ? "bottom" : "top";
      } else {
        labelSide = (defOffset < 0) ? "left" : "right";
      }
    }

    // إحداثيات بطاقة المسمى: ملاصقة وقريبة من الخط الفعلي تماماً ولا تبعد عنه
    let labelX = handleX;
    let labelY = handleY;

    if (!activeIsVertical) {
      const offsetDist = (labelTier === 2) ? 36 : 22;
      labelY = (labelSide === "bottom" || (defOffset > 0 && !sec.labelSide))
                 ? (handleY + offsetDist)
                 : (handleY - offsetDist);
    } else {
      const offsetDist = (labelTier === 2) ? 76 : 58;
      labelX = (labelSide === "left" || (defOffset < 0 && !sec.labelSide))
                 ? (handleX - offsetDist)
                 : (handleX + offsetDist);
    }

    // ─── سهم ومؤشر توضيحي يربط بطاقة الخط بالمسار هندسياً ───
    let arrowPointerHTML = "";
    const pointerColor = isSelected ? "#00F0FF" : (defOffset !== 0 ? "#38BDF8" : (isCable ? "#63B3ED" : "#48BB78"));
    const halfW = (sec.size === 'ربط حلقي' || sec.length === 0) ? 38 : 48;
    const halfH = (sec.size === 'ربط حلقي' || sec.length === 0) ? 10 : 14;

    if (!activeIsVertical && Math.abs(labelY - handleY) >= 8) {
      // خط أفقي أو شبه أفقي: المسمى أعلى أو أسفل الخط
      const isAbove = (labelY < handleY);
      const cardEdgeY = isAbove ? (labelY + halfH) : (labelY - halfH);
      const targetY = handleY;
      const targetX = labelX;

      if (isAbove) {
        // السهم يشير لأسفل باتجاه الخط
        const arrowHead = `<polygon points="${targetX},${targetY} ${targetX - 3.5},${targetY - 6.5} ${targetX + 3.5},${targetY - 6.5}" fill="${pointerColor}" />`;
        const leaderLine = `<line x1="${targetX}" y1="${cardEdgeY}" x2="${targetX}" y2="${targetY - 5.5}" stroke="${pointerColor}" stroke-width="1.3" opacity="0.9" />`;
        arrowPointerHTML = `
          <g class="sld-leader-pointer">
            ${leaderLine}
            ${arrowHead}
            <circle cx="${targetX}" cy="${targetY}" r="1.8" fill="${pointerColor}" />
          </g>
        `;
      } else {
        // السهم يشير لأعلى باتجاه الخط
        const arrowHead = `<polygon points="${targetX},${targetY} ${targetX - 3.5},${targetY + 6.5} ${targetX + 3.5},${targetY + 6.5}" fill="${pointerColor}" />`;
        const leaderLine = `<line x1="${targetX}" y1="${cardEdgeY}" x2="${targetX}" y2="${targetY + 5.5}" stroke="${pointerColor}" stroke-width="1.3" opacity="0.9" />`;
        arrowPointerHTML = `
          <g class="sld-leader-pointer">
            ${leaderLine}
            ${arrowHead}
            <circle cx="${targetX}" cy="${targetY}" r="1.8" fill="${pointerColor}" />
          </g>
        `;
      }
    } else if (activeIsVertical && Math.abs(labelX - handleX) >= 15) {
      // خط رأسي: المسمى يمين أو يسار الخط
      const isRight = (labelX > handleX);
      const cardEdgeX = isRight ? (labelX - halfW) : (labelX + halfW);
      const targetX = handleX;
      const targetY = labelY;

      if (isRight) {
        // السهم يشير لليسار باتجاه الخط
        const arrowHead = `<polygon points="${targetX},${targetY} ${targetX + 6.5},${targetY - 3.5} ${targetX + 6.5},${targetY + 3.5}" fill="${pointerColor}" />`;
        const leaderLine = `<line x1="${cardEdgeX}" y1="${targetY}" x2="${targetX + 5.5}" y2="${targetY}" stroke="${pointerColor}" stroke-width="1.3" opacity="0.9" />`;
        arrowPointerHTML = `
          <g class="sld-leader-pointer">
            ${leaderLine}
            ${arrowHead}
            <circle cx="${targetX}" cy="${targetY}" r="1.8" fill="${pointerColor}" />
          </g>
        `;
      } else {
        // السهم يشير لليمين باتجاه الخط
        const arrowHead = `<polygon points="${targetX},${targetY} ${targetX - 6.5},${targetY - 3.5} ${targetX - 6.5},${targetY + 3.5}" fill="${pointerColor}" />`;
        const leaderLine = `<line x1="${cardEdgeX}" y1="${targetY}" x2="${targetX - 5.5}" y2="${targetY}" stroke="${pointerColor}" stroke-width="1.3" opacity="0.9" />`;
        arrowPointerHTML = `
          <g class="sld-leader-pointer">
            ${leaderLine}
            ${arrowHead}
            <circle cx="${targetX}" cy="${targetY}" r="1.8" fill="${pointerColor}" />
          </g>
        `;
      }
    } else {
      // خط مائل (سحب مائل لرسم رقم ٧ أو تفريعة بزاوية)
      const ldx = handleX - labelX;
      const ldy = handleY - labelY;
      const dist = Math.hypot(ldx, ldy);
      if (dist > 8) {
        const ux = ldx / dist;
        const uy = ldy / dist;
        const startX = labelX + ux * 16;
        const startY = labelY + uy * 16;
        const tipX = handleX;
        const tipY = handleY;
        const baseDist = 6.5;
        const wingDist = 3.5;
        const baseX = tipX - ux * baseDist;
        const baseY = tipY - uy * baseDist;
        const p1x = baseX - uy * wingDist;
        const p1y = baseY + ux * wingDist;
        const p2x = baseX + uy * wingDist;
        const p2y = baseY - ux * wingDist;

        arrowPointerHTML = `
          <g class="sld-leader-pointer">
            <line x1="${startX}" y1="${startY}" x2="${baseX}" y2="${baseY}" stroke="${pointerColor}" stroke-width="1.3" opacity="0.9" />
            <polygon points="${tipX},${tipY} ${p1x},${p1y} ${p2x},${p2y}" fill="${pointerColor}" />
            <circle cx="${tipX}" cy="${tipY}" r="1.8" fill="${pointerColor}" />
          </g>
        `;
      }
    }

    const lengthText = `${sec.length || 0} م`;
    const sizeText = sec.size || (isCable ? "3*240" : "70/12");
    const customName = sec.name ? `[${sec.name}] ` : (isCable ? "[كابل] " : "[هوائي] ");

    let labelGroupHTML = "";
    if (sec.size === 'ربط حلقي') {
      labelGroupHTML = `
        <g transform="translate(${labelX}, ${labelY})">
          <rect x="-38" y="-10" width="76" height="20" class="sld-length-pill" ${isSelected ? 'stroke="#00F0FF" stroke-width="2"' : ''} />
          <text x="0" y="4" text-anchor="middle" class="sld-badge-text" fill="#63B3ED" font-size="9.5">ربط حلقي</text>
        </g>
      `;
    } else if (sec.length === 0) {
      labelGroupHTML = `
        <g transform="translate(${labelX}, ${labelY})">
          <rect x="-38" y="-10" width="76" height="20" class="sld-length-pill" ${isSelected ? 'stroke="#00F0FF" stroke-width="2"' : ''} />
          <text x="0" y="4" text-anchor="middle" class="sld-badge-text" fill="#ECC94B" font-size="9.5">${sec.name || 'توصيل مباشر'}</text>
        </g>
      `;
    } else {
      labelGroupHTML = `
        <g transform="translate(${labelX}, ${labelY})">
          <rect x="-48" y="-14" width="96" height="28" class="sld-length-pill" ${isSelected ? 'stroke="#00F0FF" stroke-width="2"' : ''} />
          <text x="0" y="-1" text-anchor="middle" class="sld-badge-text" fill="#ECC94B" font-size="10.5">${lengthText}</text>
          <text x="0" y="10" text-anchor="middle" class="sld-badge-text" fill="${isCable ? '#63B3ED' : '#9AE6B4'}" font-size="9.5">${customName}${sizeText}</text>
        </g>
      `;
    }

    return `
      <g id="sec-${sec.id}" class="sld-section-group ${selClass}" style="cursor:pointer;" onclick="handleSectionClick(event, '${sec.id}')" ondblclick="handleSectionDblClick(event, '${sec.id}')">
        <!-- منطقة النقر والتفاعل الشفافة العريضة -->
        <path d="${pathD}" fill="none" stroke="transparent" stroke-width="26" />
        
        <!-- مسار الخط أو الكابل الفعلي -->
        <path d="${pathD}" 
              fill="none"
              class="line-path ${strokeClass} ${typeClass} ${selClass}" 
              stroke="${strokeColor}" 
              ${dashAttr} />

        <!-- سهم ومؤشر توضيحي يربط بطاقة البيانات بالخط أو المسار هندسياً -->
        ${arrowPointerHTML}

        <!-- بطاقة الأرقام والمقاطع بحذاء الخط ومرتبة -->
        ${labelGroupHTML}

        <!-- مقبض انحراف وتعديل مسار الخط لأعلى أو لأسفل بالسحب المباشر -->
        <g class="sld-deflect-handle-group" data-sec-id="${sec.id}" transform="translate(${handleX}, ${handleY})">
          <circle cx="0" cy="0" r="16" fill="transparent" style="cursor:${isVertical ? 'ew-resize' : 'ns-resize'};" />
          <circle cx="0" cy="0" r="${isSelected ? 8.5 : 7}" class="sld-deflect-handle" fill="#0F172A" stroke="${defOffset !== 0 ? '#38BDF8' : strokeColor}" stroke-width="2" style="cursor:${isVertical ? 'ew-resize' : 'ns-resize'};" />
          <text x="0" y="3.5" text-anchor="middle" fill="${defOffset !== 0 ? '#38BDF8' : strokeColor}" font-size="9" font-weight="bold" pointer-events="none">${isVertical ? '↔' : '↕'}</text>
        </g>

        <!-- مقبض سحب وتوجيه الخط من الأمام في أي اتجاه -->
        <g class="sld-stretch-handle-group" data-sec-id="${sec.id}" data-node-id="${toNode ? toNode.id : ''}">
          <circle cx="${x2}" cy="${y2}" r="16" fill="transparent" style="cursor:move;" />
          <circle cx="${x2}" cy="${y2}" r="${isSelected ? 6.5 : 4}" class="sld-stretch-handle" style="cursor:move;" />
        </g>
      </g>
    `;
  },

  /**
   * حساب المواضع الذكية لكافة مسميات المقاطع على مستوى الشبكة:
   * 1. وضع مسميات الخط العمومي دائماً في الجهة العكسية للتفريعات لتتسع مساحة العمل.
   * 2. منع تداخل المسميات ببعضها تلقائياً وترتيبها في طبقات منتظمة (Tier 1 و Tier 2).
   * 3. توفير مسافة أمان كافية مع نودات التفرع ونودات التوصيل.
   */
  computeSmartLabelPositions(sections, nodeMap) {
    if (!sections || !nodeMap) return;

    // 1. خريطة المقاطع المتصلة بكل نود للتعرف على التفرعات العمودية
    const nodeToSecs = {};
    sections.forEach(sec => {
      if (!nodeToSecs[sec.from_node]) nodeToSecs[sec.from_node] = [];
      if (!nodeToSecs[sec.to_node]) nodeToSecs[sec.to_node] = [];
      nodeToSecs[sec.from_node].push(sec);
      nodeToSecs[sec.to_node].push(sec);
    });

    const labelLayouts = [];

    // 2. الحساب الأولي لكل مقطع
    sections.forEach(sec => {
      const fromNode = nodeMap[sec.from_node];
      const toNode = nodeMap[sec.to_node];
      if (!fromNode || !toNode) return;

      const startPt = this.getTerminalPoint(fromNode, true, sec);
      const endPt = this.getTerminalPoint(toNode, false, sec);
      let x1 = startPt.x, y1 = startPt.y;
      let x2 = endPt.x, y2 = endPt.y;

      if (Math.abs(x1 - x2) <= 25) x2 = x1;
      if (Math.abs(y1 - y2) <= 25) y2 = y1;

      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const isVertical = Math.abs(dy) >= Math.abs(dx);
      const visualLength = isVertical ? Math.abs(dy) : Math.abs(dx);

      // تحديد جهة المسمى: الأولوية لخاصية labelSide الصريحة
      let side = sec.labelSide;

      // إذا لم تكن محددة صراحة، نكتشف تلقائياً اتجاه التفريعات المتصلة بالنقطتين
      if (!side) {
        let hasBranchDown = false;
        let hasBranchUp = false;
        let hasBranchRight = false;
        let hasBranchLeft = false;

        const checkConnected = (nid) => {
          const connected = nodeToSecs[nid] || [];
          connected.forEach(otherSec => {
            if (otherSec.id === sec.id) return;
            const otherFrom = nodeMap[otherSec.from_node];
            const otherTo = nodeMap[otherSec.to_node];
            if (!otherFrom || !otherTo) return;
            const ptA = (otherSec.from_node === nid) ? otherFrom : otherTo;
            const ptB = (otherSec.from_node === nid) ? otherTo : otherFrom;
            const deltaX = ptB.x - ptA.x;
            const deltaY = ptB.y - ptA.y;

            // فقط التفريعات المتعامدة ذات الإزاحة الواضحة
            if (Math.abs(deltaY) >= 30 && Math.abs(deltaY) > Math.abs(deltaX)) {
              if (deltaY > 0) hasBranchDown = true;
              else hasBranchUp = true;
            }
            if (Math.abs(deltaX) >= 30 && Math.abs(deltaX) > Math.abs(deltaY)) {
              if (deltaX > 0) hasBranchRight = true;
              else hasBranchLeft = true;
            }
          });
        };

        checkConnected(sec.from_node);
        checkConnected(sec.to_node);

        if (!isVertical) {
          // خط أفقي: مسميات الخط العمومي تكون دائماً في الجهة العكسية للتفريعة
          if (hasBranchDown && !hasBranchUp) {
            side = "top"; // التفريعة لأسفل -> المسميات للأعلى
          } else if (hasBranchUp && !hasBranchDown) {
            side = "bottom"; // التفريعة للأعلى -> المسميات للأسفل
          } else {
            side = "top";
          }
        } else {
          // خط رأسي: مسميات الخط العمومي تكون دائماً في الجهة العكسية للتفريعة
          if (hasBranchRight && !hasBranchLeft) {
            side = "left"; // التفريعة يميناً -> المسميات لليسار
          } else if (hasBranchLeft && !hasBranchRight) {
            side = "right"; // التفريعة يساراً -> المسميات لليمين
          } else {
            side = "right";
          }
        }
      }

      // تحديد الطبقة (Tier): إذا كان طول المقطع صغيراً جداً، نرفعه لمنع ملامسة النودات
      let tier = 1;
      if (!isVertical && visualLength < 115) {
        tier = 2;
      } else if (isVertical && visualLength < 75) {
        tier = 2;
      }

      let labelX = midX;
      let labelY = midY;

      if (!isVertical) {
        const offset = (tier === 2) ? 36 : 22;
        labelY = (side === "bottom") ? (midY + offset) : (midY - offset);
      } else {
        const offset = (tier === 2) ? 76 : 58;
        labelX = (side === "left") ? (midX - offset) : (midX + offset);
      }

      labelLayouts.push({
        sec,
        isVertical,
        x1, y1, x2, y2,
        midX, midY,
        visualLength,
        side,
        tier,
        labelX,
        labelY
      });
    });

    // 3. منع تداخل المسميات ببعضها تلقائياً (Anti-Collision Pass)
    for (let i = 0; i < labelLayouts.length; i++) {
      for (let j = i + 1; j < labelLayouts.length; j++) {
        const a = labelLayouts[i];
        const b = labelLayouts[j];

        const overlapX = Math.abs(a.labelX - b.labelX) < 102;
        const overlapY = Math.abs(a.labelY - b.labelY) < 32;

        if (overlapX && overlapY) {
          // حدث تداخل! ترتيب المسميات في مستويين (Tiers)
          if (!a.isVertical && !b.isVertical) {
            // خطان أفقيان: الأقصر طولاً ينتقل للطبقة الثانية Tier 2
            const target = (a.visualLength <= b.visualLength) ? a : b;
            target.tier = 2;
            const offset = 36;
            target.labelY = (target.side === "bottom") ? (target.midY + offset) : (target.midY - offset);
          } else if (a.isVertical && b.isVertical) {
            // خطان رأسيان: الأقصر طولاً ينتقل للطبقة الثانية Tier 2
            const target = (a.visualLength <= b.visualLength) ? a : b;
            target.tier = 2;
            const offset = 76;
            target.labelX = (target.side === "left") ? (target.midX - 76) : (target.midX + 76);
          } else {
            // مقطع أفقي وآخر رأسي (مثلاً خط عمومي وتفريعة تخرج منه)
            const horiz = !a.isVertical ? a : b;
            horiz.tier = 2;
            const offset = 36;
            horiz.labelY = (horiz.side === "bottom") ? (horiz.midY + offset) : (horiz.midY - offset);
          }
        }
      }
    }

    // 4. حفظ الإحداثيات والطبقة في كل مقطع لاستخدامها أثناء الرسم
    labelLayouts.forEach(item => {
      item.sec._smartLabel = {
        x: item.labelX,
        y: item.labelY,
        side: item.side,
        tier: item.tier,
        midX: item.midX,
        midY: item.midY,
        isVertical: item.isVertical
      };
    });
  }

};

if (typeof window !== "undefined") {
  window.Components = Components;
}
