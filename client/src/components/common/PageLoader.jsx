import LoadingSpinner from '../LoadingSpinner';

const PageLoader = () => {
    return (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[9999] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <LoadingSpinner size={ 48 } color="border-black" />
                <p className="text-slate-900 font-bold text-sm tracking-widest animate-pulse">LOADING</p>
            </div>
        </div>
    );
};

export default PageLoader;
