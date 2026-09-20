/**
 * Smart Grid SLD Studio - Live Switching & Connectivity Simulation Engine
 * Copyright (C) ENG-MOSTAFAELMGHRABY - All Rights Reserved
 */

const SimulationEngine = {

  // فحص هل الخط متصل قبل السكينة (ربط مباشر على الخط الرئيسي المغذي) أم بعدها
  isSectionBeforeSwitch(sec, switchNode, otherNode) {
    if (!sec || !switchNode) return false;

    // 1. إذا كان الخط هو المغذي القادم إلى السكينة
    if (sec.to_node === switchNode.id && sec.from_node !== switchNode.id) {
      return true;
    }

    // 2. إذا تم تحديد الخاصية صراحة كربط مباشر قبل السكينة
    if (sec.tap_side === "before_switch" || sec.is_direct_tap === true || sec.tap_direct === true) {
      return true;
    }

    // 3. إذا تم تحديدها صراحة كخط بعد السكينة (محكوم بسيف السكينة)
    if (sec.tap_side === "after_switch") {
      return false;
    }

    // 4. الفحص الهندسي والفيزيائي للاتجاه (Switch Axis Alignment):
    // - السكينة الرأسية: تتحكم بالخط الرأسي المتجه عليها (down أو up)، وأي تفريعة أفقية (right أو left) تعتبر ربطاً مباشراً قبل السكينة
    const swDir = (switchNode.dir === "left" || switchNode.dir === "right" || switchNode.direction === "horizontal") ? "horizontal" : "vertical";
    let effectiveDir = sec.direction;
    if (!effectiveDir && otherNode) {
      const dx = otherNode.x - switchNode.x;
      const dy = otherNode.y - switchNode.y;
      if (Math.abs(dx) >= Math.abs(dy)) {
        effectiveDir = dx >= 0 ? "right" : "left";
      } else {
        effectiveDir = dy >= 0 ? "down" : "up";
      }
    }

    if (swDir === "vertical") {
      // السكينة رأسية: تتحكم فقط في الامتداد الرأسي المتجه عليها
      const isSecVertical = (effectiveDir === "down" || effectiveDir === "up");
      // الخط الرأسي محكوم بالسكينة (false)، والتفريعة الأفقية ربط مباشر قبل السكينة (true)
      return !isSecVertical;
    } else {
      // السكينة أفقية: تتحكم فقط في التفريعة الأفقية
      const isSecHorizontal = (effectiveDir === "right" || effectiveDir === "left");
      // التفريعة الأفقية محكومة بالسكينة (false)، والخط الرأسي المستمر هو خط رئيسي مباشر قبل السكينة (true)
      return !isSecHorizontal;
    }
  },

  // حساب حالة التوصيل والتغذية الكهربائية لجميع عناصر الشبكة
  computeConnectivity(nodes, sections) {
    const energizedNodes = new Set();
    const energizedSections = new Set();

    if (!nodes || nodes.length === 0) {
      return { energizedNodes, energizedSections };
    }

    // 1. العثور على مصدر التغذية (المحطة)
    const sourceNodes = nodes.filter(n => n.type === "substation");
    if (sourceNodes.length === 0 && nodes.length > 0) {
      sourceNodes.push(nodes[0]); // افتراض العقدة الأولى كمصدر
    }

    // خريطة العقد لسهولة وسرعة الوصول
    const nodeMap = {};
    nodes.forEach(n => { nodeMap[n.id] = n; });

    // بناء قائمة الجوار (Adjacency List) للشبكة مع بيانات المقاطع
    const adj = {};
    nodes.forEach(n => { adj[n.id] = []; });

    sections.forEach(sec => {
      if (adj[sec.from_node] && adj[sec.to_node]) {
        adj[sec.from_node].push({ to: sec.to_node, sec: sec });
        adj[sec.to_node].push({ to: sec.from_node, sec: sec });
      }
    });

    // خريطة حالة السكاكين (مفتوحة أو مغلقة)
    const switchOpenMap = {};
    nodes.filter(n => n.type === "switch").forEach(sw => {
      switchOpenMap[sw.id] = (sw.state === "open");
    });

    // 2. خوارزمية البحث بالاتساع (BFS) لتحديد المسارات المكهربة
    const queue = [];
    sourceNodes.forEach(src => {
      energizedNodes.add(src.id);
      queue.push(src.id);
    });

    while (queue.length > 0) {
      const currentId = queue.shift();
      const currentNode = nodeMap[currentId];
      const neighbors = adj[currentId] || [];

      for (const edge of neighbors) {
        const nextNodeId = edge.to;
        const nextNode = nodeMap[nextNodeId];
        const sec = edge.sec;

        if (!nextNode) continue;

        // إذا كانت العقدة الحالية سكينة وهي مفتوحة:
        // السكينة المفتوحة تسمح بمرور الكهرباء فقط للخطوط المتفرعة قبل السكينة (على الخط الرئيسي المغذي)
        if (currentNode && currentNode.type === "switch" && switchOpenMap[currentId]) {
          const isBefore = this.isSectionBeforeSwitch(sec, currentNode, nextNode);
          if (!isBefore) {
            // هذا الخط يقع بعد سيف السكينة والسكينة مفتوحة، إذن لا تمر الكهرباء إليه
            continue;
          }
        }

        // تسجيل كهربة الخط
        energizedSections.add(sec.id);

        // إذا لم تكن العقدة التالية مكهربة بعد، نقوم بكهربتها ومواصلة البحث
        if (!energizedNodes.has(nextNodeId)) {
          energizedNodes.add(nextNodeId);
          queue.push(nextNodeId);
        }
      }
    }

    return {
      energizedNodes,
      energizedSections
    };
  }

};
