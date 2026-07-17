// import React from "react";

// const Filters = ({ activeFilter, setActiveFilter }) => {
//   const mainFilters = ["All", "Internship", "Job", "Hackathon", "Workshops", "Spam"];

//   return (
//     <div>
//       {mainFilters.map((item) => (
//         <button
//           key={item}
//           className={`filter ${activeFilter === item ? "active" : ""}`}
//           onClick={() => setActiveFilter(item)}
//         >
//           {item}
//         </button>
//       ))}
//     </div>
//   );
// };

// export default Filters;


import React from "react";

const Filters = ({ activeFilter, setActiveFilter }) => {
  const mainFilters = ["All", "Internship", "Job", "Hackathon", "Workshops"];

  return (
    <div>
      {mainFilters.map((item) => (
        <button
          key={item}
          className={`filter ${activeFilter === item ? "active" : ""}`}
          onClick={() => setActiveFilter(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
};

export default Filters;
