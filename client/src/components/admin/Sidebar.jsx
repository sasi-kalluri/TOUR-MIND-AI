import { useState } from 'react';
import { Shield, LayoutDashboard, Activity, MapPin, AlertTriangle, Users, LogOut, Settings, Calendar } from 'lucide-react';

const SidebarItem = ({ active, onClick, icon, label, badge }) => (
    <button onClick={ onClick } className={ `w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${active ? 'bg-teal-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}` }>
        <div className="flex items-center gap-3"><span className={ active ? 'text-teal-100' : 'text-slate-400' }>{ icon }</span><span className="text-sm font-bold">{ label }</span></div>
        { badge && <span className={ `text-[10px] font-bold px-1.5 py-0.5 rounded ${active ? 'bg-teal-500 text-white' : 'bg-teal-50 text-teal-600'}` }>{ badge }</span> }
    </button>
);

const Sidebar = ({ activeTab, setActiveTab, user, logout }) => {
    const [showDropdown, setShowDropdown] = useState(false);

    return (
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed top-0 bottom-0 z-30">
            <div className="p-6">
                <h1 className="font-bold text-xl flex items-center gap-2 text-slate-800">
                    <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white"><Shield size={ 18 } fill="currentColor" /></div>
                    Admin<span className="text-teal-600">Portal</span>
                </h1>
            </div>
            <div className="flex-1 px-4 space-y-6 overflow-y-auto">
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Core Overview</p>
                    <nav className="space-y-1">
                        <SidebarItem active={ activeTab === 'dashboard' } onClick={ () => setActiveTab('dashboard') } icon={ <LayoutDashboard size={ 18 } /> } label="Dashboard" />
                        <SidebarItem active={ activeTab === 'safety' } onClick={ () => setActiveTab('safety') } icon={ <Activity size={ 18 } /> } label="Safety Command Center" badge="LIVE" />
                    </nav>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Management</p>
                    <nav className="space-y-1">
                        <SidebarItem active={ activeTab === 'destinations' } onClick={ () => setActiveTab('destinations') } icon={ <MapPin size={ 18 } /> } label="Destinations" />
                        <SidebarItem active={ activeTab === 'danger-zones' } onClick={ () => setActiveTab('danger-zones') } icon={ <AlertTriangle size={ 18 } /> } label="Danger Zones" />
                        <SidebarItem active={ activeTab === 'users' } onClick={ () => setActiveTab('users') } icon={ <Users size={ 18 } /> } label="Users" />
                        <SidebarItem active={ activeTab === 'bookings' } onClick={ () => setActiveTab('bookings') } icon={ <Calendar size={ 18 } /> } label="Bookings & Interest" />
                    </nav>
                </div>
            </div>
            <div className="p-4 border-t border-slate-100 space-y-3 relative">
                <button onClick={ () => setActiveTab('settings') } className={ `w-full ${activeTab === 'settings' ? 'bg-teal-600 shadow-md' : 'bg-slate-800 hover:bg-slate-900'} text-white rounded-lg px-4 py-2.5 flex items-center gap-3 font-bold text-sm shadow-lg transition-all` }>
                    <Settings size={ 18 } /> Settings
                </button>

                { showDropdown && (
                    <div className="absolute bottom-[4.5rem] left-4 right-4 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50 animate-in slide-in-from-bottom-2 fade-in zoom-in-95">
                        <div className="mb-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Signed in as</p>
                            <p className="font-bold text-slate-800 text-sm truncate">{ user?.name }</p>
                            <p className="text-xs font-medium text-slate-500 truncate">{ user?.email }</p>
                        </div>
                        <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded border border-teal-100">Admin</span>
                            <span className="text-[10px] text-slate-300">{ user?.role || 'Operator' }</span>
                        </div>
                    </div>
                ) }

                <div
                    className="flex items-center gap-3 px-2 py-2 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={ () => setShowDropdown(!showDropdown) }
                >
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-600">{ user?.name?.charAt(0) }</div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-bold truncate text-slate-800">{ user?.name }</p>
                        <p className="text-[10px] text-slate-500">My Profile</p>
                    </div>
                    <button onClick={ (e) => { e.stopPropagation(); logout(); } } className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors"><LogOut size={ 16 } /></button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
