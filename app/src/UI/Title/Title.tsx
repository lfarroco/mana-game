import { Button } from "react-bootstrap"

const Title = () => {

	return (
		<div className='container'>

			<div className='row'>

				<div className='col col-sm-2 offset-4'>

					<h1> Title </h1>

					<Button
						className="btn btn-primary col-12"
					>
						Start
					</Button>
					<Button
						className="btn btn-default col-12"
					>
						Options
					</Button>
					<Button
						className="btn btn-default col-12"
					>
						Credits
					</Button>
				</div>
			</div>
		</div>
	)
}

export default Title