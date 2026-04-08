// Haversine Distance Helper
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// Calculate Total Energy (Cost)
// Energy = w1 * TotalDistance + w2 * TotalCost(if applicable)
const calculateEnergy = (tour, places, weights = { w1: 1, w2: 0 }) => {
    let totalDist = 0;

    // Sum distance between consecutive points
    for (let i = 0; i < tour.length - 1; i++) {
        const from = places[tour[i]];
        const to = places[tour[i + 1]];
        totalDist += getDistance(from.lat, from.lng, to.lat, to.lng);
    }

    // Add return to start? TSP usually returns to start. 
    // For tourist trip, maybe no. Let's assume point-to-point.
    // If round trip, un-comment below:
    // const last = places[tour[tour.length-1]];
    // const first = places[tour[0]];
    // totalDist += getDistance(last.lat, last.lng, first.lat, first.lng);

    return totalDist * weights.w1;
};

// Simulated Annealing Algorithm
const solveTSP = (places, weights = { w1: 1, w2: 0 }) => {
    if (!places || places.length < 2) return places;

    // Initial State: 0, 1, 2, ... N
    let currentTour = places.map((_, i) => i);
    let currentEnergy = calculateEnergy(currentTour, places, weights);

    let bestTour = [...currentTour];
    let bestEnergy = currentEnergy;

    let temp = 10000;
    const coolingRate = 0.003;

    while (temp > 1) {
        // Create new neighbour by swapping two random cities
        const newTour = [...currentTour];
        const pos1 = Math.floor(Math.random() * newTour.length);
        const pos2 = Math.floor(Math.random() * newTour.length);

        // Swap
        [newTour[pos1], newTour[pos2]] = [newTour[pos2], newTour[pos1]];

        const newEnergy = calculateEnergy(newTour, places, weights);

        // Acceptance Probability
        if (newEnergy < currentEnergy || Math.random() < Math.exp((currentEnergy - newEnergy) / temp)) {
            currentTour = newTour;
            currentEnergy = newEnergy;

            if (currentEnergy < bestEnergy) {
                bestTour = [...currentTour];
                bestEnergy = currentEnergy;
            }
        }

        temp *= (1 - coolingRate);
    }

    // Map indices back to places
    return {
        optimizedOrder: bestTour.map(i => places[i]),
        totalDistance: bestEnergy / weights.w1
    };
};

module.exports = { solveTSP };
