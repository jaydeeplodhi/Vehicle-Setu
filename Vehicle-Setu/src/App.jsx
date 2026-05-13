import { useState, useEffect } from 'react'
import './App.css'
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";

const API_BASE_URL = "https://vehicle-setu-backend.onrender.com";

function App() {
  
  const [lang, setLang] = useState('hi');
  const [role, setRole] = useState('');
  const [activeTab, setActiveTab] = useState('search');
  const [userPhone, setUserPhone] = useState('');
  const [dashboardData, setDashboardData] = useState({ vehicles: [], bookings: [] });
  const [showDashboard, setShowDashboard] = useState(false);
  const [userVillage, setUserVillage] = useState('');
  const [userCoords, setUserCoords] = useState({ lat: null, lng: null });
  const [results, setResults] = useState([]);
  const [maxDist, setMaxDist] = useState(50);

  // --- New States for Calendar and Time ---
  const [searchDate, setSearchDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  
  const [villageList, setVillageList] = useState([]);
  const [locationInfo, setLocationInfo] = useState({ state: '', district: '', block: '' });
  const [formData, setFormData] = useState({ type: '', price: '', phone: '', village: '', lat: '', lng: '', image: null });

  const machineCatalog = [
    {
      category: { hi: "🚜 खेती की मशीनें", en: "Agriculture Machines" },
      logo: "🚜",
      color: "#2ecc71",
      items: ["Tractor", "Mini Tractor", "Power Tiller", "Rotavator", "Cultivator", "Harrow", "Disc Harrow", "MB Plough", "Seed Drill", "Happy Seeder", "Paddy Transplanter", "Reaper", "Combine Harvester", "Thresher", "Baler", "Agricultural Drone"]
    },
    {
      category: { hi: "🏗️ निर्माण मशीनें", en: "Construction Machines" },
      logo: "🏗️",
      color: "#f1c40f",
      items: ["JCB / Backhoe Loader", "Excavator", "Bulldozer", "Road Roller", "Cement Mixture Machine", "Concrete Pump", "Crane", "Tower Crane", "Wheel Loader", "Dumper", "Asphalt Paver", "Generator"]
    },
    {
      category: { hi: "🚚 परिवहन वाहन", en: "Transport Vehicles" },
      logo: "🚛",
      color: "#3498db",
      items: ["Bolero Pickup", "Tata Ace", "Truck", "Mini Truck", "Dumper Truck", "Tractor Trolley", "Auto Rickshaw", "E-Rickshaw", "Tempo", "Delivery Van", "Ambulance"]
    },
    {
      category: { hi: "💧 सिंचाई और पानी", en: "Water & Irrigation" },
      logo: "🌊",
      color: "#1abc9c",
      items: ["Borewell Machine", "Water Pump", "Submersible Pump", "Diesel Pump Set", "Sprinkler System", "Drip Irrigation System", "Water Tanker", "Pipeline Laying Machine"]
    },
    {
      category: { hi: "🐄 डेयरी और पशुपालन", en: "Livestock & Dairy" },
      logo: "🐄",
      color: "#e67e22",
      items: ["Milking Machine", "Fodder Cutter", "Feed Mixing Machine", "Poultry Feed Machine", "Cow Dung Machine"]
    },
    {
      category: { hi: "🛠️ इंडस्ट्रियल मशीनें", en: "Industrial Machines" },
      logo: "🔧",
      color: "#95a5a6",
      items: ["Generator Set", "Lathe Machine", "Drilling Machine", "Grinding Machine", "Air Compressor", "Hydraulic Jack", "Pressure Washer"]
    }
  ];

  const t = {
    hi: { owner: "🏢 मालिक", customer: "🚜 ग्राहक", search: "खोजें...", pincode: "पिनकोड", book: "बुक करें", accept: "स्वीकारें", reject: "मना करें", avail: "चालू", off: "बंद", status: "बुकिंग स्थिति", myVehicles: "मेरी मशीनें", register: "पंजीकरण", selectVillage: "-- गाँव चुनें --", catalog: "मशीन लिस्ट", dateLabel: "तारीख चुनें", timeLabel: "समय" },
    en: { owner: "🏢 OWNER", customer: "🚜 CUSTOMER", search: "Search...", pincode: "Pincode", book: "Book", accept: "Accept", reject: "Reject", avail: "Active", off: "Off", status: "Booking Status", myVehicles: "My Vehicles", register: "Register", selectVillage: "-- Select Village --", catalog: "Catalog", dateLabel: "Select Date", timeLabel: "Time" }
  };

  const fetchDash = async () => {
    if (showDashboard && userPhone) {
      const api = role === 'owner' ? 'owner-data' : 'customer-data';
      const res = await fetch(`${API_BASE_URL}/${api}?phone=${userPhone}`);
      const data = await res.json();
      setDashboardData(data);
    }
  };

  useEffect(() => {
    fetchDash();
    const interval = setInterval(fetchDash, 4000);
    return () => clearInterval(interval);
  }, [showDashboard, userPhone, role]);

  const handlePincode = async (pin, mode) => {
    if (pin.length === 6) {
      try {
        const zRes = await fetch(`https://api.zippopotam.us/in/${pin}`);
        const zData = await zRes.json();
        const pRes = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const pData = await pRes.json();

        if (pData[0].Status === "Success") {
          const offices = pData[0].PostOffice;
          const info = offices[0];
          setLocationInfo({ state: info.State, district: info.District, block: info.Block });
          const villages = offices.map(office => office.Name);
          setVillageList(villages);

          if (mode === 'register') {
            setFormData({ ...formData, lat: zData.places[0].latitude, lng: zData.places[0].longitude, village: '' });
          } else {
            setUserCoords({ lat: zData.places[0].latitude, lng: zData.places[0].longitude });
            setUserVillage(info.Name);
          }
        }
      } catch (err) { console.error("Pincode error", err); }
    }
  };

  const handleBookingAction = async (id, status) => {
    if (window.confirm(`${status}?`)) {
      await fetch(`${API_BASE_URL}/booking-action/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      fetchDash();
    }
  };

  return (
    <div className="main-app-wrapper">
      <SignedIn>
        <header className="app-header">
          <div className="container header-flex">
            <h2>Vehicle-Setu 🚜</h2>
            <button onClick={() => setLang(lang === 'hi' ? 'en' : 'hi')} className="lang-btn">
              {lang === 'hi' ? 'English' : 'हिंदी'}
            </button>
            <UserButton />
          </div>
        </header>

        <main className="container">
          {!role ? (
            <div className="role-grid">
              <div className="role-card" onClick={() => { setRole('owner'); setActiveTab('dashboard'); }}>{t[lang].owner}</div>
              <div className="role-card" onClick={() => { setRole('customer'); setActiveTab('search'); }}>{t[lang].customer}</div>
            </div>
          ) : (
            <div>
              <button className="btn-back" onClick={() => { setRole(''); setShowDashboard(false); setVillageList([]); setLocationInfo({state:'', district:'', block:''}); }}>← Back</button>

              {activeTab === 'catalog' && (
                <div className="view">
                  <h2 className="catalog-title">{t[lang].catalog} 📖</h2>
                  {machineCatalog.map((cat, idx) => (
                    <div key={idx} className="catalog-section">
                      <h3 className="cat-head" style={{borderLeft: `4px solid ${cat.color}`, color: cat.color}}>
                        {cat.logo} {cat.category[lang]}
                      </h3>
                      <div className="cat-grid">
                        {cat.items.map((item, i) => (
                          <div key={i} className="cat-item-card" style={{"--hover-color": cat.color}}>
                             <div className="cat-icon-wrapper" style={{borderColor: `${cat.color}44`}}>
                                <span className="cat-icon-main">{cat.logo}</span>
                             </div>
                             <span className="cat-name">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {role === 'customer' && activeTab === 'search' && (
                <div className="view glass-card">
                  <div className="search-filters-grid">
                    <input type="number" placeholder={t[lang].pincode} onChange={e => handlePincode(e.target.value, 'search')} className="inp" />
                    <div className="date-box">
                      <label className="input-label">{t[lang].dateLabel}</label>
                      <input type="date" className="inp date-inp" onChange={(e) => setSearchDate(e.target.value)} />
                    </div>
                  </div>

                  {villageList.length > 0 && (
                    <select className="inp" onChange={(e) => setUserVillage(e.target.value)}>
                        <option value="">{t[lang].selectVillage}</option>
                        {villageList.map((v, i) => <option key={i} value={v}>{v}</option>)}
                    </select>
                  )}
                  {userVillage && <p className="village-text">📍 {userVillage} {locationInfo.district ? `(${locationInfo.district})` : ''}</p>}
                  
                  <div className="pill-container">
                    {[10, 20, 50, 100].map(km => <button key={km} onClick={() => setMaxDist(km)} className={maxDist === km ? "pill active" : "pill"}>{km}KM</button>)}
                  </div>
                  
                  <input placeholder={t[lang].search} onChange={async (e) => {
                    const query = e.target.value.toLowerCase().trim();
                    if (query.length > 1) {
                      const res = await fetch(`${API_BASE_URL}/search?type=${query}&userLat=${userCoords.lat}&userLng=${userCoords.lng}&maxDist=${maxDist}`);
                      setResults(await res.json());
                    } else if (query.length === 0) {
                      setResults([]);
                    }
                  }} className="inp" />

                  <div className="machine-grid">
                    {results.map(v => (
                      <div key={v.id} className="machine-card">
                        <img src={v.image} alt={v.type} />
                        <div className="info">
                          <h4>{v.type} ⭐{v.rating.toFixed(1)}</h4>
                          <p>📍 {v.village} ({v.distance} KM)</p>
                          <p className="price-tag">₹{v.price}</p>
                          
                          <div className="time-selector">
                            <label className="input-label">{t[lang].timeLabel}</label>
                            <input type="time" className="inp time-inp" onChange={(e) => setBookingTime(e.target.value)} />
                          </div>

                          <button onClick={async () => {
                            if(!searchDate || !bookingTime) return alert(lang === 'hi' ? "तारीख और समय चुनें!" : "Select Date and Time!");
                            const p = prompt("Mobile Number:");
                            if (p) {
                              await fetch(`${API_BASE_URL}/book`, { 
                                method: 'POST', 
                                headers: { 'Content-Type': 'application/json' }, 
                                body: JSON.stringify({ 
                                  customerPhone: p, 
                                  ownerPhone: v.phone, 
                                  vehicleType: v.type, 
                                  village: v.village, 
                                  status: 'Pending',
                                  date: searchDate,
                                  time: bookingTime
                                }) 
                              });
                              window.open(`https://wa.me/91${v.phone}?text=नमस्ते, मुझे ${v.type} चाहिए। तारीख: ${searchDate}, समय: ${bookingTime}`, '_blank');
                            }
                          }} className="btn-main">{t[lang].book}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'dashboard' && (
                <div className="view">
                  {!showDashboard ? (
                    <div className="glass-card">
                      <input placeholder="Mobile No." onChange={e => setUserPhone(e.target.value)} className="inp" />
                      <button onClick={() => setShowDashboard(true)} className="btn-main">Open Dashboard</button>
                    </div>
                  ) : (
                    <div>
                      {role === 'owner' && (
                        <div>
                          <h4 style={{ marginBottom: '15px' }}>{t[lang].myVehicles}</h4>
                          {dashboardData.vehicles?.map(v => (
                            <div key={v._id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: '800' }}>{v.type}</span>
                              <button onClick={async () => { await fetch(`${API_BASE_URL}/vehicle-status/${v._id}`, { method: 'PATCH' }); fetchDash(); }} className="status-active-btn">
                                {v.available ? t[lang].avail : t[lang].off}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <h4 style={{ margin: '20px 0 15px 0' }}>{t[lang].status}</h4>
                      {dashboardData.bookings?.map(b => (
                        <div key={b._id} className="glass-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <b>{b.vehicleType}</b>
                            <span style={{ color: b.status === 'Accepted' ? '#2ecc71' : b.status === 'Rejected' ? '#ff4757' : '#f1c40f', fontWeight: '900' }}>{b.status}</span>
                          </div>
                          <p style={{ fontSize: '0.9rem', opacity: '0.9' }}>📞 {role === 'owner' ? b.customerPhone : b.ownerPhone} | 📍 {b.village}</p>
                          <p style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>📅 {b.date} | ⏰ {b.time}</p>
                          {role === 'owner' && b.status === 'Pending' && (
                            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                              <button onClick={() => handleBookingAction(b._id, 'Accepted')} className="btn-main" style={{ background: '#2ecc71' }}>{t[lang].accept}</button>
                              <button onClick={() => handleBookingAction(b._id, 'Rejected')} className="btn-main" style={{ background: '#ff4757' }}>{t[lang].reject}</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {role === 'owner' && activeTab === 'register' && (
                <div className="glass-card">
                  <h3 style={{ marginBottom: '20px' }}>{t[lang].register}</h3>
                  <input placeholder="Machine Name" onChange={e => setFormData({ ...formData, type: e.target.value })} className="inp" />
                  <input placeholder="Price" onChange={e => setFormData({ ...formData, price: e.target.value })} className="inp" />
                  <input placeholder="Pincode" type="number" onChange={e => handlePincode(e.target.value, 'register')} className="inp" />
                  
                  {locationInfo.state && (
                    <p className="village-text" style={{fontSize:'0.8rem', marginTop:'-5px'}}>
                        📍 {locationInfo.state} &gt; {locationInfo.district} &gt; {locationInfo.block}
                    </p>
                  )}

                  {villageList.length > 0 && (
                    <select 
                        className="inp" 
                        value={formData.village} 
                        onChange={e => setFormData({ ...formData, village: e.target.value })}
                    >
                        <option value="">{t[lang].selectVillage}</option>
                        {villageList.map((v, i) => <option key={i} value={v}>{v}</option>)}
                    </select>
                  )}

                  <input placeholder="WhatsApp" onChange={e => setFormData({ ...formData, phone: e.target.value })} className="inp" />
                  <input type="file" onChange={e => setFormData({ ...formData, image: e.target.files[0] })} className="inp" style={{ padding: '10px' }} />
                  <button onClick={async () => {
                    const d = new FormData();
                    Object.keys(formData).forEach(k => d.append(k, formData[k]));
                    await fetch(`${API_BASE_URL}/register`, { method: 'POST', body: d });
                    alert("Success!"); setActiveTab('dashboard');
                  }} className="btn-main">Register</button>
                </div>
              )}
            </div>
          )}
        </main>
        
        <nav className="bottom-nav">
          <button onClick={() => setActiveTab('search')} className={activeTab === 'search' ? "active" : ""}>
            <span className="nav-icon">🔍</span>
            <span className="nav-label">खोजें</span>
          </button>
          
          <button onClick={() => setActiveTab('catalog')} className={activeTab === 'catalog' ? "active" : ""}>
            <span className="nav-icon">📋</span>
            <span className="nav-label">मशीन लिस्ट</span>
          </button>
          
          {role === 'owner' && (
            <button onClick={() => setActiveTab('register')} className={activeTab === 'register' ? "active" : ""}>
              <span className="nav-icon">➕</span>
              <span className="nav-label">मशीन जोड़ें</span>
            </button>
          )}
          
          <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? "active" : ""}>
            <span className="nav-icon">📊</span>
            <span className="nav-label">स्टेटस</span>
          </button>
        </nav>
      </SignedIn>

      <SignedOut>
        <div className="login-screen">
          <div className="welcome-box">
            <h1>Vehicle-Setu 🚜</h1>
            <SignInButton mode="modal">
              <button className="btn-main">शुरू करें / Login</button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>
    </div>
  )
}
export default App;