import { Link } from "react-router-dom"

const Title = () => {

	return (
		<div className='container'>

			<div className='row'>


				<div className='col col-sm-2 offset-4'>

					<h1> Title </h1>

					<Link
						to="/battleground"
						className="btn btn-primary col-12"
					>
						Start
					</Link>
					<Link
						to="/options"
						className="btn btn-default col-12"
					>
						Options
					</Link>
					<Link
						to="/credits"
						className="btn btn-default col-12"
					>
						Credits
					</Link>

				</div>
			</div>
		</div>

	)
}

export default Title