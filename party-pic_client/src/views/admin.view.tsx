

function AdminPage() {
    const Aufgaben = [
        { id: 1, title: 'Aufgabe 1', description: 'Beschreibung der Aufgabe 1' },
        { id: 2, title: 'Aufgabe 2', description: 'Beschreibung der Aufgabe 2' },
        { id: 3, title: 'Aufgabe 3', description: 'Beschreibung der Aufgabe 3' },
    ];

    return (
        <div className='flex justify-center items-center h-full'>
            <div className='w-5/6 lg:w-2/3 p-6'>
                <div>
                    <h1 className='text-2xl'>Aufgaben:</h1>
                    <div>
                        {Aufgaben && Aufgaben.length > 0 ? Aufgaben.map(element => (
                            <div key={element.id} className='border p-4 my-2 rounded'>
                                <p>{element.description}</p>
                            </div>
                        )) : <p>Keine Aufgaben vorhanden.</p>}
                    </div>
                    <input type="text" className='border p-4 my-2 rounded w-full'></input>
                </div>
            </div>
        </div>
    )
}

export default AdminPage