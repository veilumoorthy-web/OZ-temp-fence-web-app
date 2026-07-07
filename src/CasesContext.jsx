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
        const ordersRange = "Sheet6!A1:Z1000";
        
        if (!apiKey || !sheetId) {
          console.warn("⚠️ Missing Google Sheets API Key or ID. Cases will be empty.");
          setLoading(false);
          return;
        }

        const [casesRes, msgsRes, gmailRes, ordersRes] = await Promise.all([
          fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${casesRange}?key=${apiKey}`),
          fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${msgsRange}?key=${apiKey}`),
          fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${gmailRange}?key=${apiKey}`).catch(() => ({ ok: false })),
          fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${ordersRange}?key=${apiKey}`).catch(() => ({ ok: false }))
        ]);

        if (!casesRes.ok || !msgsRes.ok) throw new Error("Failed to fetch from Google Sheets");

        const casesData = await casesRes.json();
        const msgsData = await msgsRes.json();
        const gmailData = gmailRes.ok ? await gmailRes.json() : { values: [] };
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
          // After trimming, header is 'Chat Id' (no trailing space)
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
            id: m['message id'],   // trimmed from ' message id'
            from: (m['sender'] || '').toLowerCase() === 'agent' ? 'agent' : 'customer',
            text: m['message'] || '',
            time: timeStr,
            timestamp: timestamp || Date.now()
          });
        });

        // Process Gmail
        const gmailRows = gmailData.values || [];
        const gmailHeaders = gmailRows[0] || [];
        const gmailMessages = gmailRows.slice(1).map(row => {
          const obj = {};
          gmailHeaders.forEach((h, i) => obj[h.trim()] = row[i]);
          return obj;
        });

        const gmailByCaseId = {};
        gmailMessages.forEach(m => {
          const caseId = m['Case ID'];
          if (!caseId) return;
          if (!gmailByCaseId[caseId]) gmailByCaseId[caseId] = [];
          
          let timeStr = m['Received Time'] || '';
          let timestamp = 0;
          if (timeStr) {
            timestamp = new Date(timeStr).getTime();
            if (timeStr.includes('T')) {
              timeStr = new Date(timestamp).toLocaleString();
            }
          }

          gmailByCaseId[caseId].push({
            id: m['Message ID'],
            from: 'customer', // Assuming fetched emails are from customer initially
            text: `[Subject: ${m['Subject'] || 'No Subject'}]\n${m['Body'] || ''}`,
            time: timeStr || m['Received Time'],
            timestamp: timestamp || Date.now(),
            customerName: m['Customer Name'],
            customerEmail: m['Customer Email'],
            status: m['Status']
          });
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
              // Trim both the key and value to eliminate surrounding spaces
              rawObj[header.trim()] = (row[i] || '').toString().trim();
            });

            // 'number ' trimmed → 'number'
            const phone = rawObj['number'] || 'Unknown Phone';
            const chatId = `CHAT-${phone}`;
            const caseId = rawObj['unique number'] || `case-${index + 1000}`;
            const customerEmail = normalizeEmail(rawObj['gmail'] || '');

            // Skip duplicate emails — only keep the first (latest after sorting) occurrence
            if (customerEmail && seenEmails.has(customerEmail)) return;
            if (customerEmail) seenEmails.add(customerEmail);

            const customerMsgs = msgsByChatId[chatId] || [];
            const gmailMsgs = gmailByCaseId[caseId] || [];

            // Combine and sort messages by time
            const combinedMsgs = [...customerMsgs, ...gmailMsgs].sort((a, b) => {
               return (a.timestamp || 0) - (b.timestamp || 0);
            });

            const lastMsg = combinedMsgs.length > 0 ? combinedMsgs[combinedMsgs.length - 1] : null;

            caseIdsSet.add(caseId);

            const normalizedPhone = normalizePhone(phone);

            // Match orders by phone OR email — deduplicate by Order ID
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
              status: 'New',
              assignee: 'Unassigned',
              priority: '3 - Moderate',
              channel: rawObj['channel'] || 'Unknown',
              opened: formatDateAndTime(rawObj['starting data'] || 'Recently'),
              customerSince: formatDateOnly(rawObj['starting data'] || 'New'),
              shortDescription: 'No description',
              unread: 0,
              lastMessage: lastMsg ? lastMsg.text : '',
              lastMessageTime: lastMsg ? lastMsg.time : '',
              lastMessageTimestamp: lastMsg ? lastMsg.timestamp : (parseInt((caseId || '').replace(/\D/g, ''), 10) || 0),
              messages: combinedMsgs,
              relatedOrders,
              // Include the original data just in case
              ...rawObj
            });
          });
          allFormattedCases.push(...formattedData);
        }

        // Add Gmail cases that are not in Customer Details
        // Skip if a case with the same customer email already exists
        Object.keys(gmailByCaseId).forEach(caseId => {
          const gmailMsgsCheck = gmailByCaseId[caseId];
          const gmailEmail = normalizeEmail(gmailMsgsCheck[0]?.customerEmail || '');
          if (!caseIdsSet.has(caseId) && (!gmailEmail || !seenEmails.has(gmailEmail))) {
            const gmailMsgs = gmailByCaseId[caseId];
            const firstMsg = gmailMsgs[0];
            const lastMsg = gmailMsgs[gmailMsgs.length - 1];
            
            allFormattedCases.push({
              id: caseId,
              customer: firstMsg.customerName || 'Unknown Email Customer',
              phone: '',
              email: firstMsg.customerEmail || '',
              status: 'New',
              assignee: 'Unassigned',
              priority: '3 - Moderate',
              channel: 'email',
              opened: formatDateAndTime(firstMsg.time || 'Recently'),
              customerSince: formatDateOnly(firstMsg.time || 'New'),
              shortDescription: `Email: ${firstMsg.text.substring(0, 50)}...`,
              unread: 0,
              lastMessage: lastMsg ? lastMsg.text : '',
              lastMessageTime: lastMsg ? lastMsg.time : '',
              lastMessageTimestamp: lastMsg ? lastMsg.timestamp : (parseInt((caseId || '').replace(/\D/g, ''), 10) || 0),
              messages: gmailMsgs,
            });
          }
        });

        setCases(allFormattedCases);
      } catch (err) {
        console.error("Google Sheets API Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
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
              messages: [...c.messages, message],
              lastMessage: message.from === 'agent' ? `You: ${message.text}` : message.text,
              lastMessageTime: message.time,
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
