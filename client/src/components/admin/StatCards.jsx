import React from 'react';
import { Users, MapPin, AlertTriangle, Bell } from 'lucide-react';

const StatCard = ({ icon, label, value, trend, color }) => {
    const map = { blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600', rose: 'bg-rose-50 text-rose-600', amber: 'bg-amber-50 text-amber-600 decoration-amber-600' };
    return (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm animate-in slide-in-from-bottom-2">
            <div className="flex justify-between items-start mb-4"><div className={ `w-10 h-10 rounded-xl flex items-center justify-center ${map[color]}` }>{ icon }</div><span className={ `text-[10px] font-bold px-2 py-1 rounded-full ${map[color]}` }>{ trend }</span></div>
            <div><p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{ label }</p><h4 className="text-2xl font-black text-slate-800">{ value }</h4></div>
        </div>
    );
};

const StatCards = ({ stats }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard icon={ <Users size={ 20 } /> } label="Active Users" value={ stats.users } trend="Live" color="blue" />
            <StatCard icon={ <MapPin size={ 20 } /> } label="Destinations" value={ stats.destinations } trend="Total" color="emerald" />
            <StatCard icon={ <AlertTriangle size={ 20 } /> } label="Danger Zones" value={ stats.zones } trend="Active" color="rose" />
            <StatCard icon={ <Bell size={ 20 } /> } label="Alerts" value={ stats.alerts } trend="Today" color="amber" />
        </div>
    );
};

export default StatCards;
