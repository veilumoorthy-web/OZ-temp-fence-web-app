import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const CasesContext = createContext(null)

export function CasesProvider({ children }) {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchCases = async () => {
      try {
        // Use Vite environment variables
        const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
        const sheetId = import.meta.env.VITE_SPREADSHEET_ID;
        const casesRange = "'Customer Details'!A1:Z1000";
        const msgsRange = "'Messages'!A1:Z1000";
        const gmailRange = "'gmail'!A1:Z1000";
        const gmailMsgsRange = "'gmail messages'!A1:Z1000";
        const ordersRange = "Sheet6!A1:Z1000";

        if (!apiKey || !sheetId) {
          console.warn("⚠️ Missing Google Sheets API Key or ID. Cases will be empty.");
          setLoading(false);
          return;
        }

        const [casesRes, msgsRes, gmailRes, gmailMsgsRes, ordersRes] = await Promise.all([
          fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${casesRange}?key=${apiKey}`, { cache: 'no-store' }),
          fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${msgsRange}?key=${apiKey}`, { cache: 'no-store' }),
          fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${gmailRange}?key=${apiKey}`, { cache: 'no-store' }).catch(() => ({ ok: false })),
          fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${gmailMsgsRange}?key=${apiKey}`, { cache: 'no-store' }).catch(() => ({ ok: false })),
          fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${ordersRange}?key=${apiKey}`, { cache: 'no-store' }).catch(() => ({ ok: false }))
        ]);

        if (!casesRes.ok || !msgsRes.ok) throw new Error("Failed to fetch from Google Sheets");

        const casesData = await casesRes.json();
        const msgsData = await msgsRes.json();
        const gmailData = gmailRes.ok ? await gmailRes.json() : { values: [] };
        const gmailMsgsData = gmailMsgsRes.ok ? await gmailMsgsRes.json() : { values: [] };
        const ordersData = ordersRes.ok ? await ordersRes.json() : { values: [] };

        // Helpers for date formatting
        function formatDateAndTime(dateStr) {
          if (!dateStr || dateStr === 'Recently' || dateStr === 'New') return dateStr;
          try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
          } catch (e) {
            return dateStr;
          }
        }

        function formatDateOnly(dateStr) {
          if (!dateStr || dateStr === 'Recently' || dateStr === 'New') return dateStr;
          try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          } catch (e) {
            return dateStr;
          }
        }

        // Process Sheet6 Orders — index by normalized phone AND by email
        const normalizePhone = (p) => (p || '').replace(/\D/g, '').replace(/^91/, '').slice(-10);
        const normalizeEmail = (e) => (e || '').trim().toLowerCase();
        const ordersRows = ordersData.values || [];
        const orderHeaders = ordersRows[0] || [];
        const allOrders = ordersRows.slice(1).map(row => {
          const obj = {};
          orderHeaders.forEach((h, i) => { obj[h.trim()] = (row[i] || '').toString().trim(); });
          return obj;
        });
        const ordersByPhone = {};
        const ordersByEmail = {};
        allOrders.forEach(order => {
          const phone = normalizePhone(order['Phone']);
          if (phone && phone.length >= 5) {
            if (!ordersByPhone[phone]) ordersByPhone[phone] = [];
            ordersByPhone[phone].push(order);
          }
          // Try common email column names from Sheet6
          const emailRaw = order['Email'] || order['email'] || order['Gmail'] || order['gmail'] || '';
          const email = normalizeEmail(emailRaw);
          if (email && email.includes('@')) {
            if (!ordersByEmail[email]) ordersByEmail[email] = [];
            ordersByEmail[email].push(order);
          }
        });

        // Process Messages — all header keys are trimmed on load
        const msgsRows = msgsData.values || [];
        const msgHeaders = msgsRows[0] || [];
        const allMessages = msgsRows.slice(1).map(row => {
          const obj = {};
          msgHeaders.forEach((h, i) => { obj[h.trim()] = (row[i] || '').toString().trim(); });
          return obj;
        });

        const msgsByChatId = {};
        let lastSeenChatId = null;

        allMessages.forEach(m => {
          let cid = m['Chat Id'];

          if (!cid || cid.toLowerCase().includes('undefined') || cid === '') {
            cid = lastSeenChatId;
          } else {
            lastSeenChatId = cid;
          }

          if (!cid) return;
          if (!msgsByChatId[cid]) msgsByChatId[cid] = [];

          let timeStr = m['time'] || '';
          let timestamp = 0;
          if (timeStr && /^\d{9,13}$/.test(timeStr)) {
            timestamp = timeStr.length === 13 ? parseInt(timeStr) : parseInt(timeStr) * 1000;
            timeStr = new Date(timestamp).toLocaleString();
          } else if (timeStr) {
            timestamp = new Date(timeStr).getTime();
            if (timeStr.includes('T')) {
              timeStr = new Date(timestamp).toLocaleString();
            }
          }

          msgsByChatId[cid].push({
            id: m['message id'],
            from: (m['sender'] || '').toLowerCase() === 'agent' ? 'agent' : 'customer',
            text: m['message'] || '',
            time: timeStr,
            timestamp: timestamp || Date.now()
          });
        });

        // Process Gmail Messages
        const gmailMsgsRows = gmailMsgsData.values || [];
        const gmailMsgsHeaders = gmailMsgsRows[0] || [];
        const allGmailMessages = gmailMsgsRows.slice(1).map(row => {
          const obj = {};
          gmailMsgsHeaders.forEach((h, i) => { obj[h.trim()] = (row[i] || '').toString().trim(); });
          return obj;
        });

        const gmailMsgsByCaseId = {};
        let lastSeenGmailCaseId = null;

        allGmailMessages.forEach(m => {
          let cid = m['Case ID'];

          if (!cid || cid.toLowerCase().includes('undefined') || cid === '') {
            cid = lastSeenGmailCaseId;
          } else {
            lastSeenGmailCaseId = cid;
          }

          if (!cid) return;
          if (!gmailMsgsByCaseId[cid]) gmailMsgsByCaseId[cid] = [];

          let timeStr = m['Time'] || m['time'] || '';
          let timestamp = 0;
          if (timeStr && /^\d{9,13}$/.test(timeStr)) {
            timestamp = timeStr.length === 13 ? parseInt(timeStr) : parseInt(timeStr) * 1000;
            timeStr = new Date(timestamp).toLocaleString();
          } else if (timeStr) {
            timestamp = new Date(timeStr).getTime();
            if (timeStr.includes('T')) {
              timeStr = new Date(timestamp).toLocaleString();
            }
          }

          gmailMsgsByCaseId[cid].push({
            id: m['Message id'] || m['message id'] || m['Gmail Message ID'],
            from: (m['Sender'] || m['sender'] || '').toLowerCase() === 'agent' ? 'agent' : 'customer',
            text: m['Message'] || m['message'] || '',
            time: timeStr,
            timestamp: timestamp || Date.now()
          });
        });

        // Process Gmail Customer Details
        const gmailRows = gmailData.values || [];
        const gmailHeaders = gmailRows[0] || [];
        const gmailCases = gmailRows.slice(1).map(row => {
          const obj = {};
          gmailHeaders.forEach((h, i) => { obj[h.trim()] = (row[i] || '').toString().trim(); });
          return obj;
        });

        const gmailGroups = {};
        gmailCases.forEach(gc => {
          const email = normalizeEmail(gc['Customer Email']);
          const caseId = gc['Case ID'];
          if (!caseId && !email) return;

          const groupKey = email ? `email:${email}` : `case:${caseId}`;
          
          if (!gmailGroups[groupKey]) {
            gmailGroups[groupKey] = {
              caseInfo: gc, // use the first seen (or last seen? we'll just update it)
              messages: []
            };
          }
          
          // Overwrite with the latest case info so we use the newest Case ID
          gmailGroups[groupKey].caseInfo = gc;

          const msgs = [...(gmailMsgsByCaseId[caseId] || [])];
          
          // Create an initial message from the Subject since the first email body might not be in the messages sheet
          if (gc['Subject'] || gc['Short Description']) {
            let timeStr = gc['Created At'] || '';
            let timestamp = timeStr ? new Date(timeStr).getTime() : Date.now();
            
            // Check if we already have a message with this exact subject to avoid duplicates
            const hasInitial = msgs.some(m => m.text && m.text.includes(gc['Subject']));
            
            if (!hasInitial) {
               msgs.unshift({
                 id: `initial-${caseId}`,
                 from: 'customer',
                 text: `[Subject: ${gc['Subject'] || 'No Subject'}]\n${gc['Short Description'] || ''}`.trim(),
                 time: timeStr,
                 timestamp: timestamp
               });
            }
          }
          
          gmailGroups[groupKey].messages = [...gmailGroups[groupKey].messages, ...msgs];
        });

        const rows = casesData.values;
        const allFormattedCases = [];
        const caseIdsSet = new Set();
        const seenEmails = new Set(); // track emails to avoid duplicate cases

        if (rows && rows.length > 1) {
          const headers = rows[0];
          const formattedData = [];
          rows.slice(1).forEach((row, index) => {
            const rawObj = {};
            headers.forEach((header, i) => {
              rawObj[header.trim()] = (row[i] || '').toString().trim();
            });

            const phone = rawObj['number'] || 'Unknown Phone';
            const chatId = `CHAT-${phone}`;
            const caseId = rawObj['unique number'] || `case-${index + 1000}`;
            const customerEmail = normalizeEmail(rawObj['gmail'] || '');

            if (customerEmail && seenEmails.has(customerEmail)) return;
            if (customerEmail) seenEmails.add(customerEmail);

            const customerMsgs = msgsByChatId[chatId] || [];
            const extraChatMsgs = gmailMsgsByCaseId[chatId] || []; // In case messages landed in gmail messages with Chat- ID
            const extraCaseMsgs = gmailMsgsByCaseId[caseId] || []; // In case they used the case ID directly
            
            let gmailMsgs = [];
            let gmailCaseInfo = null;
            if (customerEmail && gmailGroups[`email:${customerEmail}`]) {
              gmailMsgs = gmailGroups[`email:${customerEmail}`].messages;
              gmailCaseInfo = gmailGroups[`email:${customerEmail}`].caseInfo;
              delete gmailGroups[`email:${customerEmail}`];
            } else if (caseId && gmailGroups[`case:${caseId}`]) {
              gmailMsgs = gmailGroups[`case:${caseId}`].messages;
              gmailCaseInfo = gmailGroups[`case:${caseId}`].caseInfo;
              delete gmailGroups[`case:${caseId}`];
            }

            const combinedMsgs = [...customerMsgs, ...extraChatMsgs, ...extraCaseMsgs, ...gmailMsgs].sort((a, b) => {
              return (a.timestamp || 0) - (b.timestamp || 0);
            });

            // Remove duplicates by ID in case they got merged multiple ways
            const uniqueMsgs = [];
            const seenMsgIds = new Set();
            for (const m of combinedMsgs) {
              if (m.id && !seenMsgIds.has(m.id)) {
                seenMsgIds.add(m.id);
                uniqueMsgs.push(m);
              }
            }

            const lastMsg = uniqueMsgs.length > 0 ? uniqueMsgs[uniqueMsgs.length - 1] : null;
            const lastNonEmptyMsg = [...uniqueMsgs].reverse().find(m => m.text && m.text.trim() !== '') || lastMsg;

            caseIdsSet.add(caseId);

            const normalizedPhone = normalizePhone(phone);
            const seenOrderIds = new Set();
            const relatedOrders = [
              ...(ordersByPhone[normalizedPhone] || []),
              ...(customerEmail ? (ordersByEmail[customerEmail] || []) : [])
            ].filter(order => {
              const key = order['Order ID'] || JSON.stringify(order);
              if (seenOrderIds.has(key)) return false;
              seenOrderIds.add(key);
              return true;
            });

            formattedData.push({
              id: caseId,
              customer: rawObj['Name'] || 'Unknown Customer',
              phone: phone,
              email: rawObj['gmail'] || '',
              status: rawObj['State'] || rawObj['Status'] || rawObj['status'] || 'New',
              assignee: rawObj['Assigned to'] || rawObj['Assignee'] || rawObj['assignee'] || 'Unassigned',
              priority: rawObj['Priority'] || rawObj['priority'] || '3 - Moderate',
              channel: rawObj['channel'] || 'Unknown',
              opened: formatDateAndTime(rawObj['starting data'] || 'Recently'),
              customerSince: formatDateOnly(rawObj['starting data'] || 'New'),
              shortDescription: rawObj['Work note'] || rawObj['Short Description'] || rawObj['shortDescription'] || rawObj['Description'] || rawObj['description'] || 'No description',
              unread: 0,
              lastMessage: lastNonEmptyMsg ? lastNonEmptyMsg.text : '',
              lastMessageTime: lastNonEmptyMsg ? lastNonEmptyMsg.time : '',
              lastMessageTimestamp: lastMsg ? lastMsg.timestamp : (parseInt((caseId || '').replace(/\D/g, ''), 10) || 0),
              messages: uniqueMsgs,
              relatedOrders,
              ...rawObj,
              ...(gmailCaseInfo ? gmailCaseInfo : {}) // merge gmail details if found
            });
          });
          allFormattedCases.push(...formattedData);
        }

        // Add Gmail cases that are not in Customer Details
        Object.keys(gmailGroups).forEach(groupKey => {
          const { caseInfo, messages } = gmailGroups[groupKey];
          const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
          const lastNonEmptyMsg = [...messages].reverse().find(m => m.text && m.text.trim() !== '') || lastMsg;

          const caseId = caseInfo['Case ID'] || groupKey.replace('email:', 'EMAIL-');

          allFormattedCases.push({
            id: caseId,
            customer: caseInfo['Customer Name'] || 'Unknown Email Customer',
            phone: '',
            email: caseInfo['Customer Email'] || '',
            status: caseInfo['Status (New, Open, Pending, Closed)'] || caseInfo['Status'] || 'New',
            assignee: caseInfo['Assigned To'] || caseInfo['Assignee'] || 'Unassigned',
            priority: caseInfo['Priority'] || '3 - Moderate',
            channel: caseInfo['Channel (Email)'] || 'email',
            opened: formatDateAndTime(caseInfo['Created At'] || 'Recently'),
            customerSince: formatDateOnly(caseInfo['Created At'] || 'New'),
            shortDescription: caseInfo['Short Description'] || caseInfo['Subject'] || 'No description',
            unread: 0,
            lastMessage: lastNonEmptyMsg ? lastNonEmptyMsg.text : '',
            lastMessageTime: lastNonEmptyMsg ? lastNonEmptyMsg.time : '',
            lastMessageTimestamp: lastMsg ? lastMsg.timestamp : (parseInt((caseId || '').replace(/\D/g, ''), 10) || 0),
            messages: messages,
          });
        });

        setCases(prevCases => {
          return allFormattedCases.map(newCase => {
            const oldCase = prevCases.find(p => p.id === newCase.id);
            if (oldCase) {
              const localMsgs = oldCase.messages.filter(m => m.isLocal);
              if (localMsgs.length > 0) {
                const mergedMsgs = [...newCase.messages, ...localMsgs].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                const lastMsg = mergedMsgs[mergedMsgs.length - 1];
                const lastNonEmptyMsg = [...mergedMsgs].reverse().find(m => m.text && m.text.trim() !== '') || lastMsg;
                return {
                  ...newCase,
                  messages: mergedMsgs,
                  lastMessage: lastNonEmptyMsg ? (lastNonEmptyMsg.from === 'agent' ? `You: ${lastNonEmptyMsg.text}` : lastNonEmptyMsg.text) : newCase.lastMessage,
                  lastMessageTime: lastNonEmptyMsg ? lastNonEmptyMsg.time : newCase.lastMessageTime,
                  lastMessageTimestamp: lastMsg ? lastMsg.timestamp : newCase.lastMessageTimestamp
                };
              }
            }
            return newCase;
          });
        });
      } catch (err) {
        console.error("Google Sheets API Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Fetch immediately on mount
    fetchCases();

    // Then automatically fetch every 30 seconds to keep data fresh
    const intervalId = setInterval(fetchCases, 30000);

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, []);

  const updateCase = useCallback((id, updates) => {
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
  }, [])

  const addMessage = useCallback((id, message) => {
    setCases((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
            ...c,
            messages: [...c.messages, { ...message, isLocal: true, timestamp: Date.now() }],
            lastMessage: message.from === 'agent' ? `You: ${message.text}` : message.text,
            lastMessageTime: message.time,
            lastMessageTimestamp: Date.now(),
          }
          : c
      )
    )
  }, [])

  return (
    <CasesContext.Provider value={{ cases, loading, error, updateCase, addMessage }}>
      {children}
    </CasesContext.Provider>
  )
}

export function useCases() {
  const ctx = useContext(CasesContext)
  if (!ctx) throw new Error('useCases must be used within CasesProvider')
  return ctx
}
