import React from 'react';

const Tooltip = ({ children, content, position = 'top' }) => {
    if (!content) return children;

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    return (
        <div className="group relative inline-flex items-center justify-center">
            { children }
            <div
                className={ `absolute z-50 whitespace-nowrap bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${positionClasses[position]}` }
            >
                { content }
                {/* Arrow */ }
                <div
                    className={ `absolute w-2 h-2 bg-slate-900 rotate-45 ${position === 'top' ? 'bottom-[-3px] left-1/2 -translate-x-1/2' :
                            position === 'bottom' ? 'top-[-3px] left-1/2 -translate-x-1/2' :
                                position === 'left' ? 'right-[-3px] top-1/2 -translate-y-1/2' :
                                    'left-[-3px] top-1/2 -translate-y-1/2'
                        }` }
                ></div>
            </div>
        </div>
    );
};

export default Tooltip;
